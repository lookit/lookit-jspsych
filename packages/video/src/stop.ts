import { JsPsych, JsPsychPlugin, TrialType } from "jspsych";
import Recorder from "./recorder";

const info = <const>{ name: "stop-record-plugin", parameters: {} };
type Info = typeof info;

/**
 *
 */
export default class StopRecordPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private recorder: Recorder;
  /** @param jsPsych */
  constructor(private jsPsych: JsPsych) {
    this.recorder = new Recorder(this.jsPsych);
  }

  /**
   * @param _display_element
   * @param _trial
   */
  trial(
    _display_element: HTMLElement,
    _trial: TrialType<Info>,
  ): void | Promise<any> {
    setTimeout(() => this.recorder.stop(), 1000);
  }
}
