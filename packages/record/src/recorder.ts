import Data from "@lookit/data";
import lookitS3 from "@lookit/data/dist/lookitS3";
import autoBind from "auto-bind";
import { JsPsych } from "jspsych";
import { RecorderInitializeError } from "./error";
import { getFilename } from "./utils";

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private blobs: Blob[] = [];
  private localDownload: boolean = false;
  private s3?: lookitS3;
  private filename: string;

  /**
   * Recorder for online experiments.
   *
   * @param jsPsych - Object supplied by jsPsych.
   * @param filename - Name for the video recording file (string). Should be
   *   provided if the Recorder is being instantiated to start a new recording.
   *   Can be omitted if the Recorder is being instantiated to access an
   *   existing recording stream.
   */
  public constructor(
    private jsPsych: JsPsych,
    filename?: string,
  ) {
    this.filename = filename || getFilename("null");
    if (!this.localDownload) {
      this.s3 = new Data.LookitS3(this.filename);
    }
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
   * Start recording. Also, adds event listeners for handling data and checks
   * for recorder initialization.
   */
  public async start() {
    this.initializeCheck();
    this.recorder.addEventListener("dataavailable", this.handleDataAvailable);
    this.recorder.addEventListener("stop", this.handleStop);
    if (!this.localDownload) {
      await this.s3?.createUpload();
    }
    this.recorder.start();
  }

  /** Stop recording and camera/microphone. */
  public stop() {
    this.recorder.stop();
    this.stream.getTracks().map((t) => t.stop());
  }

  /** Throw Error if there isn't a recorder provided by jsPsych. */
  private initializeCheck() {
    if (!this.recorder) {
      throw new RecorderInitializeError();
    }
  }

  /** Handle the recorder's stop event. */
  private async handleStop() {
    if (this.localDownload) {
      await this.download();
    } else {
      await this.s3?.completeUpload();
    }
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
    return new Promise((resolve, reject) => {
      const reader = Object.assign(new FileReader(), {
        /**
         * When promise resolves, it'll return the result.
         *
         * @returns Result of reading data as url.
         */
        onload: () => resolve(reader.result),
        /**
         * On error, promise return reader error.
         *
         * @returns Error message.
         */
        onerror: () => reject(Error(reader.error?.toString())),
      });
      reader.readAsDataURL(new File([bytes], "", { type }));
    });
  }
}
