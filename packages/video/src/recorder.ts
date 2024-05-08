import autoBind from "auto-bind";
import { JsPsych } from "jspsych";

/** Recorder handles state of recording and data storage. */
export default class Recorder {
  private blobs: Blob[] = [];

  /**
   * Recorder for online experiments.
   *
   * @param jsPsych - Object supplied by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    autoBind(this);
  }

  /**
   * Get recorder from jsPsydh plugin API.
   *
   * @returns MediaRecorder from the plugin API.
   */
  private get recorder() {
    return this.jsPsych.pluginAPI.getCameraRecorder();
  }

  /**
   * Get stream from jsPsydh plugin API.
   *
   * @returns MediaStream from the plugin API.
   */
  private get stream() {
    return this.jsPsych.pluginAPI.getCameraStream();
  }

  /** Start recording. Also, adds event listeners for handling data. */
  public start() {
    this.recorder.addEventListener("dataavailable", this.handleDataAvailable);
    this.recorder.addEventListener("stop", this.handleStop);
    this.recorder.start();
  }

  /** Stop recording and camera. */
  public stop() {
    this.recorder.stop();
    this.stream.getTracks().map((t: MediaStreamTrack) => t.stop());
  }

  /** Handle recorder's stop event. */
  private async handleStop() {
    await this.download();
  }

  /**
   * Function ran at each time slice and when recorder has stopped.
   *
   * @param event - Event containing blob data.
   */
  private handleDataAvailable(event: BlobEvent) {
    this.blobs.push(event.data);
  }

  /** Temp method to download data url. */
  private async download() {
    const data = (await this.bytesToBase64DataUrl(
      new Blob(this.blobs),
    )) as string;
    const link = document.createElement("a");
    link.href = data;
    link.download = `something_${new Date().getTime()}.webm`;
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
