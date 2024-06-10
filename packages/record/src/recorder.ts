import Data from "@lookit/data";
import lookitS3 from "@lookit/data/dist/lookitS3";
import autoBind from "auto-bind";
import { JsPsych } from "jspsych";
import { RecorderInitializeError } from "./error";

/** Recorder handles the state of recording and data storage. */
export default class Recorder {
  private blobs: Blob[] = [];
  private localDownload: boolean = false;
  private s3?: lookitS3;
  private fileNameStr: string;
  private stopPromise?: Promise<void>;

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
    this.fileNameStr = this.createFilename(fileNamePrefix);
    if (!this.localDownload && this.fileNameStr) {
      this.s3 = new Data.LookitS3(this.fileNameStr);
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
   * Get the video recording filename.
   *
   * @returns Filename string for this instance.
   */
  public get filename() {
    return this.fileNameStr;
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
    // create a stop promise and pass the resolve function as an argument to the stop event callback,
    // so that the stop event handler can resolve the stop promise
    this.stopPromise = new Promise((resolve) => {
      this.recorder.addEventListener("stop", this.handleStop(resolve));
    });
    if (!this.localDownload) {
      await this.s3?.createUpload();
    }
    this.recorder.start();
  }

  /** Stop recording and camera/microphone. */
  public stop() {
    this.recorder.stop();
    this.stream.getTracks().map((t) => t.stop());
    return this.stopPromise;
  }

  /** Throw Error if there isn't a recorder provided by jsPsych. */
  private initializeCheck() {
    if (!this.recorder) {
      throw new RecorderInitializeError();
    }
  }

  /** Handle the recorder's stop event. */
  private handleStop(resolve: { (value: void | PromiseLike<void>): void }) {
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
}
