import autoBind from "auto-bind";
import { JsPsych, JsPsychExtension, JsPsychExtensionInfo } from "jspsych";
import Recorder from "./recorder";

/** This extension will allow reasearchers to record trials. */
export default class TrialRecordExtension implements JsPsychExtension {
  public static readonly info: JsPsychExtensionInfo = {
    name: "chs-trial-record-extension",
  };

  private recorder: Recorder;

  /**
   * Video recording extension.
   *
   * @param jsPsych - JsPsych object passed into extensions.
   */
  public constructor(private jsPsych: JsPsych) {
    this.recorder = new Recorder(this.jsPsych);
    autoBind(this);
  }

  /** Ran on the initialize step for extensions. */
  async initialize() {}

  /** Ran at the start of a trail. */
  public on_start() {}

  /** Ran when the trial has loaded. */
  public on_load() {
    this.recorder.start();
  }

  /**
   * Ran when trial has finished.
   *
   * @returns Trail data.
   */
  public on_finish() {
    this.recorder.stop();
    return {};
  }
}
