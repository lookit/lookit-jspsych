import { JsPsych, JsPsychPlugin, TrialType } from "jspsych";
import Recorder from "./recorder";

const info = <const>{ name: "start-record-plugin", parameters: {} };
type Info = typeof info;

/**
 *
 */
export default class StartRecordPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  recorder: Recorder;
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
    this.recorder.start();
    setTimeout(() => this.jsPsych.finishTrial(), 1000);
  }
}
