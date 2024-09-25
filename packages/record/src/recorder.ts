import Data from "@lookit/data";
import LookitS3 from "@lookit/data/dist/lookitS3";
import autoBind from "auto-bind";
import { JsPsych } from "jspsych";
import Mustache from "mustache";
import play_icon from "../img/play-icon.svg";
import record_icon from "../img/record-icon.svg";
import playbackFeed from "../templates/playback-feed.mustache";
import webcamFeed from "../templates/webcam-feed.mustache";
import {
  CreateURLError,
  MicCheckError,
  NoPlayBackElementError,
  NoStopPromiseError,
  NoStreamError,
  NoWebCamElementError,
  RecorderInitializeError,
  S3UndefinedError,
  StreamActiveOnResetError,
  StreamDataInitializeError,
  StreamInactiveInitializeError,
} from "./errors";
import { CSSWidthHeight } from "./types";
// import MicCheckProcessor from './mic_check';  // TO DO: fix or remove this. See: https://github.com/lookit/lookit-jspsych/issues/44

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private url?: string;
  private _s3?: LookitS3;

  private blobs: Blob[] = [];
  private localDownload: boolean =
    process.env.LOCAL_DOWNLOAD?.toLowerCase() === "true";
  private filename?: string;
  private minVolume: number = 0.1;
  public micChecked: boolean = false;

  /**
   * Use null rather than undefined so that we can set these back to null when
   * destroying.
   */
  private processorNode: AudioWorkletNode | null = null;

  private stopPromise?: Promise<void>;
  private webcam_element_id = "lookit-jspsych-webcam";
  private playback_element_id = "lookit-jspsych-playback";

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
   * Request permission to use the webcam and/or microphone. This can be used
   * with and without specific device selection (and other constraints).
   *
   * @param constraints - Media stream constraints object with 'video' and
   *   'audio' properties, whose values can be boolean or a
   *   MediaTrackConstraints object or undefined.
   * @param constraints.video - If false, do not include video. If true, use the
   *   default webcam device. If a media track constraints object is passed,
   *   then it can contain the properties of all media tracks and video tracks:
   *   https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints.
   * @param constraints.audio - If false, do not include audio. If true, use the
   *   default mic device. If a media track constraints object is passed, then
   *   it can contain the properties of all media tracks and audio tracks:
   *   https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints.
   * @returns Camera/microphone stream.
   */
  public async requestPermission(constraints: MediaStreamConstraints) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  }

  /**
   * Gets the lists of available cameras and mics (via Media Devices
   * 'enumerateDevices'). These lists can be used to populate camera/mic
   * selection elements.
   *
   * @param include_audio - Whether or not to include audio capture (mic)
   *   devices. Optional, default is true.
   * @param include_camera - Whether or not to include the webcam (video)
   *   devices. Optional, default is true.
   * @returns Promise that resolves with an object with properties 'cameras' and
   *   'mics', containing lists of available devices.
   */
  public getDeviceLists(
    include_audio: boolean = true,
    include_camera: boolean = true,
  ): Promise<{ cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }> {
    return navigator.mediaDevices.enumerateDevices().then((devices) => {
      let unique_cameras: Array<MediaDeviceInfo> = [];
      let unique_mics: Array<MediaDeviceInfo> = [];
      if (include_camera) {
        const cams = devices.filter(
          (d) =>
            d.kind === "videoinput" &&
            d.deviceId !== "default" &&
            d.deviceId !== "communications",
        );
        unique_cameras = cams.filter(
          (cam, index, arr) =>
            arr.findIndex((v) => v.groupId == cam.groupId) == index,
        );
      }
      if (include_audio) {
        const mics = devices.filter(
          (d) =>
            d.kind === "audioinput" &&
            d.deviceId !== "default" &&
            d.deviceId !== "communications",
        );
        unique_mics = mics.filter(
          (mic, index, arr) =>
            arr.findIndex((v) => v.groupId == mic.groupId) == index,
        );
      }
      return { cameras: unique_cameras, mics: unique_mics };
    });
  }

  /**
   * Initialize recorder using the jsPsych plugin API.
   *
   * @param stream - Media stream returned from getUserMedia that should be used
   *   to set up the jsPsych recorder.
   * @param opts - Media recorder options to use when setting up the recorder.
   */
  public intializeRecorder(stream: MediaStream, opts?: MediaRecorderOptions) {
    this.jsPsych.pluginAPI.initializeCameraRecorder(stream, opts);
  }

  /** Reset the recorder to be used again. */
  public reset() {
    if (this.stream.active) {
      throw new StreamActiveOnResetError();
    }
    this.intializeRecorder(this.streamClone.clone());
    this.blobs = [];
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
    const { webcam_element_id, stream } = this;
    const view = { height, width, webcam_element_id, record_icon };
    element.innerHTML = Mustache.render(webcamFeed, view);
    const webcam = element.querySelector<HTMLVideoElement>(
      `#${webcam_element_id}`,
    );

    if (!webcam) {
      throw new NoWebCamElementError();
    }

    webcam.srcObject = stream;
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
    const { playback_element_id } = this;
    const view = {
      src: this.url,
      width,
      height,
      playback_element_id,
      play_icon,
    };

    this.clearWebcamFeed();

    element.insertAdjacentHTML(
      "afterbegin",
      Mustache.render(playbackFeed, view),
    );

    const playbackElement = element.querySelector<HTMLVideoElement>(
      `video#${this.playback_element_id}`,
    );

    if (!playbackElement) {
      throw new NoPlayBackElementError();
    }

    playbackElement.addEventListener("ended", on_ended, { once: true });
  }

  /**
   * Perform a sound check on the audio input (microphone).
   *
   * @param minVol - Minimum mic activity needed to reach the mic check
   *   threshold (optional). Default is `this.minVolume`
   * @returns Promise that resolves when the mic check is complete because the
   *   audio stream has reached the required minimum level.
   */
  public checkMic(minVol: number = this.minVolume) {
    if (this.stream) {
      const audioContext = new AudioContext();
      const microphone = audioContext.createMediaStreamSource(this.stream);
      // This currently loads from lookit-api static files.
      // TO DO: load mic_check.js from dist or a URL? See https://github.com/lookit/lookit-jspsych/issues/44
      return audioContext.audioWorklet
        .addModule("/static/js/mic_check.js")
        .then(() => this.createConnectProcessor(audioContext, microphone))
        .then(() => this.setupPortOnMessage(minVol))
        .catch((err) => {
          return Promise.reject(new MicCheckError(err));
        });
    } else {
      return Promise.reject(new NoStreamError());
    }
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
  private stopTracks() {
    this.recorder.stop();
    this.stream.getTracks().map((t) => t.stop());
  }

  /**
   * Stop recording and camera/microphone. This will stop accessing all media
   * tracks, clear the webcam feed element (if there is one), and return the
   * stop promise.
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

  /**
   * Check access to webcam/mic stream.
   *
   * @returns Whether or not the recorder has webcam/mic access.
   */
  public camMicAccess(): boolean {
    return !!this.recorder && this.stream.active;
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

  /**
   * Private helper to handle the mic level messages that are sent via an
   * AudioWorkletProcessor. This checks the current level against the minimum
   * threshold, and if the threshold is met, sets the micChecked property to
   * true and resolves the checkMic promise.
   *
   * @param currentActivityLevel - Microphone activity level calculated by the
   *   processor node.
   * @param minVolume - Minimum microphone activity level needed to pass the
   *   microphone check.
   * @param resolve - Resolve callback function for Promise returned by the
   *   checkMic method.
   */
  private onMicActivityLevel(
    currentActivityLevel: number,
    minVolume: number,
    resolve: () => void,
  ) {
    if (currentActivityLevel > minVolume) {
      this.micChecked = true;
      this.processorNode?.port.postMessage({ micChecked: true });
      this.processorNode = null;
      resolve();
    }
  }

  /**
   * Private helper that takes the audio context and microphone, creates the
   * processor node for the mic check input level processing, and connects the
   * microphone to the processor node.
   *
   * @param audioContext - Audio context that was created in checkMic. This is
   *   used to create the processor node.
   * @param microphone - Microphone audio stream source, created in checkMic.
   *   The processor node will be connected to this source.
   * @returns Promise that resolves after the processor node has been created,
   *   and the microphone audio stream source is connected to the processor node
   *   and audio context destination.
   */
  private createConnectProcessor(
    audioContext: AudioContext,
    microphone: MediaStreamAudioSourceNode,
  ) {
    return new Promise<void>((resolve) => {
      this.processorNode = new AudioWorkletNode(
        audioContext,
        "mic-check-processor",
      );
      microphone.connect(this.processorNode).connect(audioContext.destination);
      resolve();
    });
  }

  /**
   * Private helper to setup the port's on message event handler for the mic
   * check processor node. This adds the event related callback, which calls
   * onMicActivityLevel with the event data.
   *
   * @param minVol - Minimum volume level (RMS amplitude) passed from checkMic.
   * @returns Promise that resolves from inside the onMicActivityLevel callback,
   *   when the mic stream input level has reached the threshold.
   */
  private setupPortOnMessage(minVol: number) {
    return new Promise<void>((resolve) => {
      /**
       * Callback on the microphone's AudioWorkletNode that fires in response to
       * a message event containing the current mic level. When the mic level
       * reaches the threshold, this callback sets the micChecked property to
       * true and resolves this Promise (via onMicActivityLevel).
       *
       * @param event - The message event that was sent from the processor on
       *   the audio worklet node. Contains a 'data' property (object) which
       *   contains a 'volume' property (number).
       */
      this.processorNode!.port.onmessage = (event: MessageEvent) => {
        // handle message from the processor: event.data
        if (this.onMicActivityLevel) {
          if ("data" in event && "volume" in event.data) {
            this.onMicActivityLevel(event.data.volume, minVol, resolve);
          }
        }
      };
    });
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
