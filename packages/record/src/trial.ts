import autoBind from "auto-bind";
import { JsPsych, JsPsychExtension, JsPsychExtensionInfo } from "jspsych";
import Recorder from "./recorder";
import { jsPsychPluginWithInfo } from "./types";

/** This extension will allow reasearchers to record trials. */
export default class TrialRecordExtension implements JsPsychExtension {
  public static readonly info: JsPsychExtensionInfo = {
    name: "chs-trial-record-extension",
  };

  private recorder?: Recorder;
  private pluginName: string | undefined;

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
    this.pluginName = this.getCurrentPluginName();
    this.recorder?.start(false, `${this.pluginName}`);
  }

  /**
   * Ran when trial has finished.
   *
   * @returns Trial data.
   */
  public async on_finish() {
    await this.recorder?.stop();
    return {};
  }

  /**
   * Gets the plugin name for the trial that is being extended. This is same as
   * the "trial_type" value that is stored in the data for this trial.
   *
   * @returns Plugin name string from the plugin class's info.
   */
  private getCurrentPluginName() {
    const current_plugin_class = this.jsPsych.getCurrentTrial().type;
    return (current_plugin_class as jsPsychPluginWithInfo).info.name;
  }
}
