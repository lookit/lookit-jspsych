import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { version } from "../package.json";
import { NoSessionRecordingError } from "./errors";
import Recorder from "./recorder";

declare let window: LookitWindow;

const info = <const>{
  name: "stop-record-plugin",
  version,
  parameters: {
    /**
     * This string can contain HTML markup. Any content provided will be
     * displayed while the recording is uploading. If null (the default), then
     * the default 'uploading video, please wait' (or appropriate translation
     * based on 'locale') will be displayed. Use a blank string for no
     * message/content.
     */
    wait_for_upload_message: {
      type: ParameterType.HTML_STRING,
      default: null as null | string,
    },
    /**
     * Locale code used for translating the default 'uploading video, please
     * wait' message. This code must be present in the translation files. If the
     * code is not found then English will be used. If the
     * 'wait_for_upload_message' parameter is specified then this value is
     * ignored.
     */
    locale: {
      type: ParameterType.STRING,
      default: "en-us",
    },
  },
  data: {},
};
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
    if (window.chs.sessionRecorder) {
      this.recorder = window.chs.sessionRecorder as Recorder;
    } else {
      throw new NoSessionRecordingError();
    }
  }

  /**
   * Trial function called by jsPsych.
   *
   * @param display_element - DOM element where jsPsych content is being
   *   rendered (set in initJsPsych and automatically made available to a
   *   plugin's trial method via jsPsych core).
   * @param trial - Trial object with parameters/values.
   */
  public trial(display_element: HTMLElement, trial: TrialType<Info>): void {
    if (trial.wait_for_upload_message == null) {
      display_element.innerHTML = chsTemplates.uploadingVideo(trial);
    } else {
      display_element.innerHTML = trial.wait_for_upload_message;
    }
    this.recorder
      .stop()
      .then(() => {
        window.chs.sessionRecorder = null;
        display_element.innerHTML = "";
        this.jsPsych.finishTrial();
      })
      .catch((err) => {
        console.error("StopRecordPlugin: recorder stop/upload failed.", err);
        // TO DO: display translated error msg and/or researcher contact info
      });
  }
}
