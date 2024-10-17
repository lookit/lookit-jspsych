import autoBind from "auto-bind";
import { JsPsych, JsPsychExtension, JsPsychExtensionInfo } from "jspsych";
import Recorder from "./recorder";

/** This extension will allow reasearchers to record trials. */
export default class TrialRecordExtension implements JsPsychExtension {
  public static readonly info: JsPsychExtensionInfo = {
    name: "chs-trial-record-extension",
  };

  private recorder?: Recorder;

  /**
   * Video recording extension.
   *
   * @param jsPsych - JsPsych object passed into extensions.
   */
  public constructor(private jsPsych: JsPsych) {
    autoBind(this);
  }

  /**
   * Ran on the initialize step for extensions, called when an instance of
   * jsPsych is first initialized through initJsPsych().
   */
  public async initialize() {}

  /** Ran at the start of a trial. */
  public on_start() {
    this.recorder = new Recorder(this.jsPsych);
  }

  /** Ran when the trial has loaded. */
  public on_load() {
    this.recorder?.start(false, `${this.jsPsych.getCurrentTrial().type}`);
  }

  /**
   * Ran when trial has finished.
   *
   * @returns Trial data.
   */
  public on_finish() {
    this.recorder?.stop();
    return {};
  }
}
