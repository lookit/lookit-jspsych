import chsTemplates from "@lookit/templates";
import autoBind from "auto-bind";
import {
  JsPsych,
  JsPsychExtension,
  JsPsychExtensionInfo,
  PluginInfo,
  TrialType,
} from "jspsych";
import { version } from "../package.json";
import Recorder from "./recorder";
import { jsPsychPluginWithInfo } from "./types";

// JsPsychExtensionInfo does not allow parameters, so we define them as interfaces and use these to type the arguments passed to extension initialize and on_start functions.
interface Parameters {
  /**
   * Content that should be displayed while the recording is uploading. If null
   * (the default), then the default 'uploading video, please wait...' (or
   * appropriate translation based on 'locale') will be displayed. Use a blank
   * string for no message/content. Otherwise this parameter can be set to a
   * custom string and can contain HTML markup. If you want to embed
   * images/video/audio in this HTML string, be sure to preload the media files
   * with the `preload` plugin and manual preloading. Use a blank string (`""`)
   * for no message/content.
   *
   * @default null
   */
  wait_for_upload_message?: null | string;
  /**
   * Locale code used for translating the default 'uploading video, please
   * wait...' message. This code must be present in the translation files. If
   * the code is not found then English will be used. If the
   * 'wait_for_upload_message' parameter is specified then this value
   * isignored.
   *
   * @default "en-us"
   */
  locale?: string;
}

/** This extension allows researchers to record webcam audio/video during trials. */
export default class TrialRecordExtension implements JsPsychExtension {
  public static readonly info: JsPsychExtensionInfo = {
    name: "chs-trial-record-extension",
    version,
    data: {},
  };

  private recorder?: Recorder;
  private pluginName: string | undefined;
  private uploadMsg: null | string = null;
  private locale: string = "en-us";

  /**
   * Video recording extension.
   *
   * @param jsPsych - JsPsych object passed into extensions.
   */
  public constructor(private jsPsych: JsPsych) {
    autoBind(this);
  }

  /**
   * Runs on the initialize step for extensions, called when an instance of
   * jsPsych is first initialized through initJsPsych().
   *
   * @param params - Parameters object
   * @param params.wait_for_upload_message - Message to display while waiting
   *   for upload. String or null (default)
   * @param params.locale - Message to display while waiting for upload. String
   *   or null (default).
   */
  public async initialize(params?: Parameters) {
    await new Promise<void>((resolve) => {
      this.uploadMsg = params?.wait_for_upload_message
        ? params.wait_for_upload_message
        : null;
      this.locale = params?.locale ? params.locale : "en-us";
      console.log(this.uploadMsg);
      console.log(this.locale);
      resolve();
    });
  }

  /**
   * Runs at the start of a trial.
   *
   * @param startParams - Parameters object
   * @param startParams.wait_for_upload_message - Message to display while
   *   waiting for upload. String or null (default). If given, this will
   *   overwrite the value used during initialization.
   */
  public on_start(startParams?: Parameters) {
    if (startParams?.wait_for_upload_message) {
      this.uploadMsg = startParams.wait_for_upload_message;
    }
    if (startParams?.locale) {
      this.locale = startParams.locale;
    }
    console.log(this.uploadMsg);
    console.log(this.locale);
    this.recorder = new Recorder(this.jsPsych);
  }

  /** Runs when the trial has loaded. */
  public on_load() {
    this.pluginName = this.getCurrentPluginName();
    this.recorder?.start(false, `${this.pluginName}`);
  }

  /**
   * Runs when trial has finished.
   *
   * @returns Any data from the trial extension that should be added to the rest
   *   of the trial data.
   */
  public async on_finish() {
    const displayEl = this.jsPsych.getDisplayElement();
    if (this.uploadMsg == null) {
      displayEl.innerHTML = chsTemplates.uploadingVideo({
        type: this.jsPsych.getCurrentTrial().type,
        locale: this.locale,
      } as TrialType<PluginInfo>);
    } else {
      displayEl.innerHTML = this.uploadMsg;
    }
    try {
      await this.recorder?.stop();
      displayEl.innerHTML = "";
    } catch (err) {
      console.error("TrialRecordExtension: recorder stop/upload failed.", err);
      // TO DO: display translated error msg and/or researcher contact info
    }
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
