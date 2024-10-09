import Data from "@lookit/data";
import LookitS3 from "@lookit/data/dist/lookitS3";
import autoBind from "auto-bind";
import Handlebars from "handlebars";
import { JsPsych } from "jspsych";
import play_icon from "../img/play-icon.svg";
import record_icon from "../img/record-icon.svg";
import playbackFeed from "../templates/playback-feed.hbs";
import recordFeed from "../templates/record-feed.hbs";
import webcamFeed from "../templates/webcam-feed.hbs";
import {
  CreateURLError,
  NoStopPromiseError,
  NoWebCamElementError,
  RecorderInitializeError,
  S3UndefinedError,
  StreamActiveOnResetError,
  StreamDataInitializeError,
  StreamInactiveInitializeError,
} from "./errors";
import { CSSWidthHeight } from "./types";

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private url?: string;
  private _s3?: LookitS3;

  private blobs: Blob[] = [];
  private localDownload: boolean =
    process.env.LOCAL_DOWNLOAD?.toLowerCase() === "true";
  private filename?: string;
  private stopPromise?: Promise<void>;
  private webcam_element_id = "lookit-jspsych-webcam";

  private streamClone: MediaStream;

  /**
   * Recorder for online experiments.
   *
   * @param jsPsych - Object supplied by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    this.streamClone = this.stream.clone();
    autoBind(this);
  }

  /**
   * Get recorder from jsPsych plugin API.
   *
   * If camera recorder hasn't been initialized, then return the microphone
   * recorder.
   *
   * @returns MediaRecorder from the plugin API.
   */
  private get recorder() {
    return (
      this.jsPsych.pluginAPI.getCameraRecorder() ||
      this.jsPsych.pluginAPI.getMicrophoneRecorder()
    );
  }

  /**
   * Get stream from either recorder.
   *
   * @returns MediaStream from the plugin API.
   */
  private get stream() {
    return this.recorder.stream;
  }

  /**
   * Get s3 class variable. Throw error if doesn't exist.
   *
   * @returns - S3 object.
   */
  private get s3() {
    if (!this._s3) {
      throw new S3UndefinedError();
    }
    return this._s3;
  }

  /** Set s3 class variable. */
  private set s3(value: LookitS3) {
    this._s3 = value;
  }

  /**
   * Initialize recorder using the jsPsych plugin API. There should always be a
   * stream initialized when the Recorder class is instantiated. This method is
   * just used to re-initialize the stream with a clone when the recorder needs
   * to be reset during a trial.
   *
   * @param stream - Media stream returned from getUserMedia that should be used
   *   to set up the jsPsych recorder.
   * @param opts - Media recorder options to use when setting up the recorder.
   */
  public initializeRecorder(stream: MediaStream, opts?: MediaRecorderOptions) {
    this.jsPsych.pluginAPI.initializeCameraRecorder(stream, opts);
  }

  /** Reset the recorder to be used again. */
  public reset() {
    if (this.stream.active) {
      throw new StreamActiveOnResetError();
    }
    this.initializeRecorder(this.streamClone.clone());
    this.blobs = [];
  }

  /**
   * Insert a rendered template into an element.
   *
   * @param element - Element to have video inserted into.
   * @param template - Template string
   * @param insertStream - Should the stream be attributed to the webcam
   *   element.
   * @returns Webcam element
   */
  private insertVideoFeed(
    element: HTMLDivElement,
    template: string,
    insertStream: boolean = true,
  ) {
    const { webcam_element_id, stream } = this;

    element.innerHTML = template;

    const webcam = element.querySelector<HTMLVideoElement>(
      `#${webcam_element_id}`,
    );

    if (!webcam) {
      throw new NoWebCamElementError();
    }

    if (insertStream) {
      webcam.srcObject = stream;
    }

    return webcam;
  }

  /**
   * Insert a video element containing the webcam feed onto the page.
   *
   * @param element - The HTML div element that should serve as the container
   *   for the webcam display.
   * @param width - The width of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'100%'`
   * @param height - The height of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'auto'`
   */
  public insertWebcamFeed(
    element: HTMLDivElement,
    width: CSSWidthHeight = "100%",
    height: CSSWidthHeight = "auto",
  ) {
    const { webcam_element_id } = this;
    const view = { height, width, webcam_element_id };
    this.insertVideoFeed(element, Handlebars.compile(webcamFeed)(view));
  }

  /**
   * Insert video playback feed into supplied element.
   *
   * @param element - The HTML div element that should serve as the container
   *   for the webcam display.
   * @param on_ended - Callback function called when playing video ends.
   * @param width - The width of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'100%'`
   * @param height - The height of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'auto'`
   */
  public insertPlaybackFeed(
    element: HTMLDivElement,
    on_ended: (this: HTMLVideoElement, e: Event) => void,
    width: CSSWidthHeight = "100%",
    height: CSSWidthHeight = "auto",
  ) {
    const { webcam_element_id } = this;
    const view = {
      src: this.url,
      width,
      height,
      webcam_element_id,
      play_icon,
    };

    const playbackElement = this.insertVideoFeed(
      element,
      Handlebars.compile(playbackFeed)(view),
      false,
    );

    playbackElement.addEventListener("ended", on_ended, { once: true });
  }

  /**
   * Insert a feed to be used for recording into an element.
   *
   * @param element - Element to have record feed inserted into.
   * @param width - The width of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'100%'`
   * @param height - The height of the video element containing the webcam feed,
   *   in CSS units (optional). Default is `'auto'`
   */
  public insertRecordFeed(
    element: HTMLDivElement,
    width: CSSWidthHeight = "100%",
    height: CSSWidthHeight = "auto",
  ) {
    const { webcam_element_id } = this;
    const view = { height, width, webcam_element_id, record_icon };
    this.insertVideoFeed(element, Handlebars.compile(recordFeed)(view));
  }

  /**
   * Start recording. Also, adds event listeners for handling data and checks
   * for recorder initialization.
   *
   * @param prefix - Prefix for the video recording file name (string). This is
   *   the string that comes before "_<TIMESTAMP>.webm".
   */
  public async start(prefix: "consent" | "session_video" | "trial_video") {
    this.initializeCheck();

    // Set filename
    this.filename = `${prefix}_${new Date().getTime()}.webm`;

    // Instantiate s3 object
    if (!this.localDownload) {
      this.s3 = new Data.LookitS3(this.filename);
    }

    this.recorder.addEventListener("dataavailable", this.handleDataAvailable);

    // create a stop promise and pass the resolve function as an argument to the stop event callback,
    // so that the stop event handler can resolve the stop promise
    this.stopPromise = new Promise((resolve) => {
      this.recorder.addEventListener("stop", this.handleStop(resolve));
    });

    if (!this.localDownload) {
      await this.s3.createUpload();
    }

    this.recorder.start();
  }

  /**
   * Stop all streams/tracks. This stops any in-progress recordings and releases
   * the media devices. This is can be called when recording is not in progress,
   * e.g. To end the camera/mic access when the experiment is displaying the
   * camera feed but not recording (e.g. Video-config).
   */
  public stopTracks() {
    this.recorder.stop();
    this.stream.getTracks().map((t) => t.stop());
  }

  /**
   * Stop recording and camera/microphone. This will stop accessing all media
   * tracks, clear the webcam feed element (if there is one), and return the
   * stop promise. This should only be called after recording has started.
   *
   * @returns Promise that resolves after the media recorder has stopped and
   *   final 'dataavailable' event has occurred, when the "stop" event-related
   *   callback function is called.
   */
  public stop() {
    this.stopTracks();
    this.clearWebcamFeed();

    if (!this.stopPromise) {
      throw new NoStopPromiseError();
    }
    return this.stopPromise;
  }

  /** Throw Error if there isn't a recorder provided by jsPsych. */
  private initializeCheck() {
    if (!this.recorder) {
      throw new RecorderInitializeError();
    }

    if (!this.stream.active) {
      throw new StreamInactiveInitializeError();
    }

    if (this.blobs.length !== 0) {
      throw new StreamDataInitializeError();
    }
  }

  /**
   * Handle the recorder's stop event. This is a function that takes the stop
   * promise's 'resolve' as an argument and returns a function that resolves
   * that stop promise. The function that is returned is used as the recorder's
   * "stop" event-related callback function.
   *
   * @param resolve - Promise resolve function.
   * @returns Function that is called on the recorder's "stop" event.
   */
  private handleStop(resolve: () => void) {
    return async () => {
      if (this.blobs.length === 0) {
        throw new CreateURLError();
      }
      this.url = URL.createObjectURL(new Blob(this.blobs));

      if (this.localDownload) {
        this.download();
      } else {
        await this.s3.completeUpload();
      }

      resolve();
    };
  }

  /**
   * Function ran at each time slice and when the recorder stopped.
   *
   * @param event - Event containing blob data.
   */
  private handleDataAvailable(event: BlobEvent) {
    this.blobs.push(event.data);
    if (!this.localDownload) {
      this.s3.onDataAvailable(event.data);
    }
  }

  /** Download data url used in local development. */
  private download() {
    if (this.filename && this.url) {
      const link = document.createElement("a");
      link.href = this.url;
      link.download = this.filename;
      link.click();
    }
  }

  /** Private helper to clear the webcam feed, if there is one. */
  private clearWebcamFeed() {
    const webcam_feed_element = document.querySelector(
      `#${this.webcam_element_id}`,
    ) as HTMLVideoElement;
    if (webcam_feed_element) {
      webcam_feed_element.remove();
    }
  }
}
