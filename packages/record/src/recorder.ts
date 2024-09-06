import Data from "@lookit/data";
import lookitS3 from "@lookit/data/dist/lookitS3";
import autoBind from "auto-bind";
import { JsPsych } from "jspsych";
import Mustache from "mustache";
import { NoStopPromiseError, RecorderInitializeError } from "./error";
import webcamFeed from "./templates/webcam-feed.mustache";
import { CSSWidthHeight } from "./types";

// import MicCheckProcessor from './mic_check';  // TO DO: fix or remove this. See: https://github.com/lookit/lookit-jspsych/issues/44

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private blobs: Blob[] = [];
  private localDownload: boolean =
    process.env.LOCAL_DOWNLOAD?.toLowerCase() === "true";
  private filename: string;
  private stopPromise: Promise<void> | undefined;
  private minVolume: number = 0.1;
  private webcam_element_id = "lookit-jspsych-webcam";
  public micChecked: boolean = false;
  /**
   * Use null rather than undefined so that we can set these back to null when
   * destroying.
   */
  private processorNode: AudioWorkletNode | null = null;
  private s3: lookitS3 | null = null;
  /**
   * Store the reject function for the stop promise so that we can reject it in
   * the destroy recorder method.
   */
  private rejectStopPromise: (reason: string) => void = () => {};

  /**
   * Recorder for online experiments.
   *
   * @param jsPsych - Object supplied by jsPsych.
   * @param fileNamePrefix - Prefix for the video recording file name (string).
   *   This is the string that comes before "_<TIMESTAMP>.webm".
   */
  public constructor(
    private jsPsych: JsPsych,
    fileNamePrefix: string,
  ) {
    this.filename = this.createFilename(fileNamePrefix);
    if (!this.localDownload) {
      this.s3 = new Data.LookitS3(this.filename);
    }
    autoBind(this);
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
    const view = { height, width, webcam_element_id };
    element.innerHTML = Mustache.render(webcamFeed, view);
    element.querySelector<HTMLVideoElement>(
      `#${webcam_element_id}`,
    )!.srcObject = stream;
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
        .then(() => {
          return new Promise<void>((resolve) => {
            this.processorNode = new AudioWorkletNode(
              audioContext,
              "mic-check-processor",
            );
            microphone
              .connect(this.processorNode)
              .connect(audioContext.destination);
            /**
             * Callback on the microphone's AudioWorkletNode that fires in
             * response to a message event containing the current mic level.
             * When the mic level reaches the threshold, this callback sets the
             * micChecked property to true and resolves this Promise (via
             * onMicActivityLevel).
             *
             * @param event - The message event that was sent from the processor
             *   on the audio worklet node. Contains a 'data' property (object)
             *   which contains a 'volume' property (number).
             */
            this.processorNode.port.onmessage = (event: MessageEvent) => {
              // handle message from the processor: event.data
              if (this.onMicActivityLevel) {
                if ("data" in event && "volume" in event.data) {
                  this.onMicActivityLevel(event.data.volume, minVol, resolve);
                }
              }
            };
          });
        })
        .catch((e) => {
          throw new Error(`Mic check error: ${e}`);
        });
    } else {
      return Promise.reject(new Error(`Mic check error: no input stream.`));
    }
  }

  /**
   * Start recording. Also, adds event listeners for handling data and checks
   * for recorder initialization.
   */
  public async start() {
    this.initializeCheck();
    this.recorder.addEventListener("dataavailable", this.handleDataAvailable);
    // create a stop promise and pass the resolve function as an argument to the stop event callback,
    // so that the stop event handler can resolve the stop promise
    this.stopPromise = new Promise((resolve, reject) => {
      this.recorder.addEventListener("stop", this.handleStop(resolve));
      this.rejectStopPromise = reject;
    });
    if (!this.localDownload) {
      await this.s3?.createUpload();
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
   * Stop recording and camera/microphone.
   *
   * @returns Promise that resolves after the media recorder has stopped and
   *   final 'dataavailable' event has occurred, when the "stop" event-related
   *   callback function is called.
   */
  public stop() {
    this.stopTracks();
    // Clear the webcam feed display if there is one.
    const webcam_feed_element = document.querySelector(
      `#${this.webcam_element_id}`,
    ) as HTMLVideoElement;
    if (webcam_feed_element) {
      webcam_feed_element.remove();
    }
    if (!this.stopPromise) {
      throw new NoStopPromiseError();
    }

    return this.stopPromise;
  }

  /**
   * Destroy the recorder. When a plugin/extension destroys the recorder, it
   * will set the whole Recorder class instance to null, so we don't need to
   * reset the Recorder instance variables/states. We should complete the S3
   * upload and stop any async processes that might continue to run (audio
   * worklet for the mic check, stop promise). We also need to stop the tracks
   * to release the media devices (even if they're not recording). Setting S3 to
   * null should release the video blob data from memory.
   */
  public async destroy() {
    this.recorder.ondataavailable = null;
    this.stopTracks();
    // Complete any MPU that might've been created and set S3 to null to clear data
    if (this.s3?.uploadInProgress) {
      await this.s3?.completeUpload();
    }
    this.s3 = null;
    // Stop the audio worklet processor if it's running
    if (this.processorNode !== null) {
      this.processorNode.port.postMessage({ micChecked: true });
      this.processorNode = null;
    }
    // Reject any existing stop promise, in case it is pending.
    if (this.stopPromise) {
      this.rejectStopPromise("RecorderDestroyed");
    }
  }

  /** Throw Error if there isn't a recorder provided by jsPsych. */
  private initializeCheck() {
    if (!this.recorder) {
      throw new RecorderInitializeError();
    }
  }

  /**
   * Handle the recorder's stop event. This is a function that takes the stop
   * promise's 'resolve' as an argument and returns a function that resolves
   * that stop promise. The function that is returned is used as the recorder's
   * "stop" event-related callback function.
   *
   * @returns Function that is called on the recorder's "stop" event.
   */
  private handleStop(resolve: {
    (value: void | PromiseLike<void>): void;
    (): void;
  }) {
    return async () => {
      if (this.localDownload) {
        await this.download();
      } else {
        await this.s3?.completeUpload();
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
      this.s3?.onDataAvailable(event.data);
    }
  }

  /** Temp method to download data url. */
  private async download() {
    const data = (await this.bytesToBase64DataUrl(
      new Blob(this.blobs),
    )) as string;
    const link = document.createElement("a");
    link.href = data;
    link.download = this.filename;
    link.click();
  }

  /**
   * Temp method to convert blobs to a data url.
   *
   * @param bytes - Bytes or blobs.
   * @param type - Mimetype.
   * @returns Result of reading data as url.
   */
  private bytesToBase64DataUrl(
    bytes: BlobPart,
    type = "video/webm; codecs=vp8",
  ) {
    return new Promise((resolve) => {
      const reader = Object.assign(new FileReader(), {
        /**
         * When promise resolves, it'll return the result.
         *
         * @returns Result of reading data as url.
         */
        onload: () => resolve(reader.result),
      });
      reader.readAsDataURL(new File([bytes], "", { type }));
    });
  }

  /**
   * Function to create a video recording filename.
   *
   * @param prefix - (string): Start of the file name for the video recording.
   * @returns Filename string, including the prefix, date/time and webm
   *   extension.
   */
  private createFilename(prefix: string) {
    return `${prefix}_${new Date().getTime()}.webm`;
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
   * Check access to webcam/mic stream.
   *
   * @returns Whether or not the recorder has webcam/mic access.
   */
  public camMicAccess(): boolean {
    return this.recorder && this.stream?.active;
  }
}
