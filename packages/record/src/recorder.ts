import Data from "@lookit/data";
import LookitS3 from "@lookit/data/dist/lookitS3";
import { LookitWindow } from "@lookit/data/dist/types";
import autoBind from "auto-bind";
import Handlebars from "handlebars";
import { JsPsych } from "jspsych";
import playbackFeed from "../hbs/playback-feed.hbs";
import recordFeed from "../hbs/record-feed.hbs";
import webcamFeed from "../hbs/webcam-feed.hbs";
import play_icon from "../img/play-icon.svg";
import record_icon from "../img/record-icon.svg";
import {
  CreateURLError,
  NoFileNameError,
  NoStopPromiseError,
  NoWebCamElementError,
  RecorderInitializeError,
  S3UndefinedError,
  StreamActiveOnResetError,
  StreamDataInitializeError,
  StreamInactiveInitializeError,
  TimeoutError,
} from "./errors";
import { CSSWidthHeight, StopOptions, StopResult } from "./types";
import { promiseWithTimeout } from "./utils";

declare const window: LookitWindow;

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private url?: string;
  private _s3?: LookitS3;

  private blobs: Blob[] = [];
  private localDownload: boolean =
    process.env.LOCAL_DOWNLOAD?.toLowerCase() === "true";
  private filename?: string;
  private stopPromise?: Promise<string>;
  private webcam_element_id = "lookit-jspsych-webcam";
  private mimeType = "video/webm";

  // persistent clone of the original stream so we can re-initialize
  private streamClone: MediaStream;

  /**
   * Recorder for online experiments.
   *
   * @param jsPsych - Object supplied by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    this.streamClone = this.stream.clone();
    autoBind(this);
    // Use the class instance's mimeType default as a fallback if we can't get the mime type from the initialized jsPsych recorder.
    this.mimeType = this.recorder?.mimeType || this.mimeType;
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
    const recorder_options: MediaRecorderOptions = {
      ...opts,
      mimeType: this.mimeType,
    };
    this.jsPsych.pluginAPI.initializeCameraRecorder(stream, recorder_options);
  }

  /**
   * Reset the recorder. This is used internally after stopping/uploading a
   * recording, in order to create a new active stream that can be used by a new
   * Recorder instance. This can also be used by the consuming plugin/extension
   * when a recorder needs to be reset without the stop/upload events (e.g. in
   * the video config plugin).
   */
  public reset() {
    // Reset can only be called after the current stream has been fully stopped.
    if (this.stream.active) {
      throw new StreamActiveOnResetError();
    }
    // Ensure later recordings have a valid active stream.
    this.initializeRecorder(this.streamClone.clone());
    // Clear blob buffer (any pending uploads are handled by LookitS3 instances and tracked globally)
    this.blobs = [];
    // TO DO: reset S3/filename/URL?
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
   * @param consent - Boolean indicating whether or not the recording is consent
   *   footage.
   * @param trial_type - Trial type, as saved in the jsPsych data. This comes
   *   from the plugin info "name" value (not the class name).
   */
  public async start(consent: boolean, trial_type: string) {
    this.initializeCheck();

    // Set video filename
    this.filename = this.createFileName(consent, trial_type);

    // Instantiate s3 object
    if (!this.localDownload) {
      this.s3 = new Data.LookitS3(this.filename);
    }

    this.recorder.addEventListener("dataavailable", this.handleDataAvailable);

    // create a stop promise and pass the resolve function as an argument to the stop event callback,
    // so that the stop event handler can resolve the stop promise
    this.stopPromise = new Promise<string>((resolve) => {
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
   * When calling recorder.stop, plugins may:
   *
   * - Await the 'stopped' promise
   * - Await the 'uploaded' promise to wait for the upload to finish before
   *   continuing
   * - Not await either promise to continue immediately and regardless of the
   *   stop/upload outcomes
   *
   * @param options - Object with the following:
   * @param options.maintain_container_size - Optional boolean indicating
   *   whether or not to maintain the current size of the webcam feed container
   *   when removing the video element. Default is false. If true, the container
   *   will be resized to match the dimensions of the video element before it is
   *   removed. This is useful for avoiding layout jumps when the webcam
   *   container will be re-used during the trial.
   * @param options.stop_timeout_ms - Number of seconds to wait for the stop
   *   process to complete.
   * @param options.upload_timeout_ms - Number of seconds to wait for the upload
   *   process to complete.
   * @returns Object with two promises:
   *
   *   - Stopped: Promise<void> - Promise that resolves after the media recorder has
   *       stopped and final 'dataavailable' event has occurred, when the "stop"
   *       event-related callback function is called.
   *   - Uploaded: Promise<void> - Promise that resolves when the S3 upload
   *       completes.
   */
  public stop({
    maintain_container_size = false,
    stop_timeout_ms = null,
    upload_timeout_ms = 10000,
  }: StopOptions = {}): StopResult {
    this.preStopCheck();
    this.clearWebcamFeed(maintain_container_size);
    this.stopTracks();

    // Snapshot anything needed for upload before the Recorder instance is reset.
    // URL is placeholder because it will not be defined until after the stop promise is resolved.
    const snapshot = {
      s3: !this.localDownload ? this.s3 : null,
      filename: this.filename,
      localDownload: this.localDownload,
      url: "null",
    };

    // Wrap the existing stopPromise with timeout if needed, otherwise return as is.
    const stopped: Promise<string> = stop_timeout_ms
      ? promiseWithTimeout(
          this.stopPromise!,
          stop_timeout_ms,
          this.createTimeoutHandler("stop"),
        )
      : this.stopPromise!;

    // Chain reset off the stop promise, which is either the original stop promise or a promise race with the timeout.
    stopped.finally(() => {
      try {
        // It's safe to reset because recording is fully stopped and S3 info has been snapshotted.
        this.reset();
      } catch (err) {
        console.error("Error while resetting recorder after stop: ", err);
      }
    });

    // Create the upload (or local download) promise
    const uploadPromise: Promise<void> = (async () => {
      let url: string;
      try {
        url = await stopped;
        if (url == "timeout") {
          // Stop failed, throw so that the upload promise reflects this failure
          throw new TimeoutError("Recorder stop timed out.");
        }
      } catch (err) {
        console.warn("Upload failed because recorder stop timed out");
        throw err;
      }
      snapshot.url = url;
      if (snapshot.localDownload) {
        try {
          this.download(snapshot.filename!, snapshot.url);
          await Promise.resolve();
        } catch (err) {
          console.error("Local download failed: ", err);
          throw err;
        }
      } else {
        try {
          await snapshot.s3!.completeUpload();
        } catch (err) {
          console.error("Upload failed: ", err);
          throw err;
        }
      }
    })();

    // Wrap the upload promise in a timeout if needed, otherwise return as is.
    const uploaded: Promise<void | string> = upload_timeout_ms
      ? promiseWithTimeout(
          uploadPromise,
          upload_timeout_ms,
          this.createTimeoutHandler("upload"),
        )
      : uploadPromise;

    // Track background uploads in case the consuming plugin is not awaiting the upload.
    // We don't want the timeout version because this one can continue in the background.
    window.chs.pendingUploads.push(uploadPromise);

    // Return the pair of promises so that the calling plugin can await them.
    return { stopped, uploaded };
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
   * Check for necessary conditions before stop/upload process, and throw errors
   * if needed.
   */
  private preStopCheck() {
    if (!this.recorder) {
      throw new RecorderInitializeError();
    }
    if (!this.stream.active) {
      throw new StreamInactiveInitializeError();
    }
    if (!this.stopPromise) {
      throw new NoStopPromiseError();
    }
    if (!this.filename) {
      throw new NoFileNameError();
    }
  }

  /**
   * Handle the recorder's stop event. This is a function that takes the stop
   * promise's 'resolve' as an argument and returns a function that resolves
   * that stop promise with the URL that is created from the recording.
   *
   * @param resolve - Resolve function that resolves the stop promise that was
   *   created upon the start of recording.
   * @returns Function that is called on the recorder's "stop" event. This
   *   function resolves the stop promise for this recording with a URL.
   */
  private handleStop(resolve: (value: string | PromiseLike<string>) => void) {
    return () => {
      if (this.blobs.length === 0) {
        throw new CreateURLError();
      }
      this.url = URL.createObjectURL(new Blob(this.blobs));
      resolve(this.url);
    };
  }

  /**
   * Function ran at each time slice and when the recorder stopped.
   *
   * @param event - Event containing blob data.
   */
  private handleDataAvailable(event: BlobEvent) {
    // Store locally for URL creation
    this.blobs.push(event.data);
    if (!this.localDownload) {
      // Forward to LookitS3 instance, which manages uploading
      this.s3.onDataAvailable(event.data);
    }
  }

  /**
   * Download data url used in local development. This can be used on
   * snapshotted recordings after the recorder has been reset, so we need to
   * pass in the filename and URL rather than relying on this.
   *
   * @param filename - Filename for the recording that will be downloaded.
   * @param url - URL containing the file data to be downloaded.
   */
  private download(filename: string, url: string) {
    if (filename && url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    }
  }

  /**
   * Private helper to clear the webcam feed, if there is one. If remove is
   * false, the video element source attribute is cleared and the parent div
   * will be set to the same dimensions. This is useful for avoiding layout
   * jumps when the webcam container and video element will be re-used during
   * the trial.
   *
   * @param maintain_container_size - Boolean indicating whether or not to set
   *   the webcam feed container size before removing the video element
   */
  private clearWebcamFeed(maintain_container_size: boolean) {
    const webcam_feed_element = document.querySelector(
      `#${this.webcam_element_id}`,
    ) as HTMLVideoElement;
    if (webcam_feed_element) {
      if (maintain_container_size) {
        const parent_div = webcam_feed_element.parentElement as HTMLDivElement;
        if (parent_div) {
          const width = webcam_feed_element.offsetWidth;
          const height = webcam_feed_element.offsetHeight;
          parent_div.style.height = `${height}px`;
          parent_div.style.width = `${width}px`;
        }
      }
      webcam_feed_element.remove();
    }
  }

  /**
   * Creates a valid video file name based on parameters
   *
   * @param consent - Boolean indicating whether or not the recording is consent
   *   footage.
   * @param trial_type - Trial type, as saved in the jsPsych data. This comes
   *   from the plugin info "name" value (not the class name).
   * @returns File name string with .webm extension.
   */
  private createFileName(consent: boolean, trial_type: string) {
    // File name formats:
    // consent: consent-videoStream_{study}_{frame_id}_{response}_{timestamp}_{random_digits}.webm
    // non-consent: videoStream_{study}_{frame_id}_{response}_{timestamp}_{random_digits}.webm
    const prefix = consent ? "consent-videoStream" : "videoStream";
    const last_data = this.jsPsych.data.getLastTrialData().values();
    const curr_trial_index = (
      last_data.length > 0 ? last_data[last_data.length - 1].trial_index + 1 : 0
    ).toString();
    const trial_id = `${curr_trial_index}-${trial_type}`;
    const rand_digits = Math.floor(Math.random() * 1000);
    return `${prefix}_${window.chs.study.id}_${trial_id}_${window.chs.response.id}_${new Date().getTime()}_${rand_digits}.webm`;
  }

  /**
   * Create the timeout handler function for events that we're awaiting with a
   * timeout.
   *
   * @param eventName - Name of the event we're awaiting, e.g. 'stop', 'upload'
   * @returns Callback function if the event promise times out.
   */
  private createTimeoutHandler(eventName: string) {
    return () => {
      console.warn(`Recorder ${eventName} timed out`);
    };
  }
}
