import { JsPsych, JsPsychPlugin } from "jspsych";
import Recorder from "./recorder";

const info = <const>{ name: "stop-record-plugin", parameters: {} };
type Info = typeof info;

/** Stop recording. Used by researchers who want to record across trials. */
export default class StopRecordPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private recorder: Recorder;

  /**
   * Plugin used to stop recording.
   *
   * @param jsPsych - Object provided by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    this.recorder = new Recorder(this.jsPsych);
  }

  /** Trial function called by jsPsych. */
  public trial(): void {
    this.recorder.stop();
    setTimeout(() => this.jsPsych.finishTrial(), 1000);
  }
}
