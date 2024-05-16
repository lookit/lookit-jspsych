import { JsPsych, JsPsychPlugin } from "jspsych";
import Recorder from "./recorder";
import { getFilename } from "./utils";

const info = <const>{ name: "start-record-plugin", parameters: {} };
type Info = typeof info;

/** Start recording. Used by researchers who want to record across trials. */
export default class StartRecordPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private recorder: Recorder;
  private filename: string;

  /**
   * Plugin used to start recording.
   *
   * @param jsPsych - Object provided by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    this.filename = getFilename("session_video");
    this.recorder = new Recorder(this.jsPsych, this.filename);
  }

  /** Trial function called by jsPsych. */
  public trial() {
    this.recorder.start();
    setTimeout(() => this.jsPsych.finishTrial(), 1000);
  }
}
