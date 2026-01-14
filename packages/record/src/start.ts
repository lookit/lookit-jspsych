import { LookitWindow } from "@lookit/data/dist/types";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { version } from "../package.json";
import { ExistingRecordingError } from "./errors";
import Recorder from "./recorder";

declare let window: LookitWindow;

const info = <const>{
  name: "start-record-plugin",
  version,
  parameters: {
    /**
     * This string can contain HTML markup. Any content provided will be
     * displayed while the video recording connection is established. If null
     * (the default), then the default 'establishing video connection, please
     * wait' (or appropriate translation based on 'locale') will be displayed.
     * Use a blank string for no message/content.
     */
    wait_for_connection_message: {
      type: ParameterType.HTML_STRING,
      default: null as null | string,
    },
    /**
     * Locale code used for translating the default 'establishing video
     * connection, please wait' message. This code must be present in the
     * translation files. If the code is not found then English will be used. If
     * the 'wait_for_connection_message' parameter is specified then this value
     * is ignored.
     */
    locale: {
      type: ParameterType.STRING,
      default: "en-us",
    },
  },
  data: {},
};
type Info = typeof info;

/** Start recording. Used by researchers who want to record across trials. */
export default class StartRecordPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private recorder: Recorder;

  /**
   * Plugin used to start recording.
   *
   * @param jsPsych - Object provided by jsPsych.
   */
  public constructor(private jsPsych: JsPsych) {
    this.recorder = new Recorder(this.jsPsych);
    if (!window.chs.sessionRecorder) {
      window.chs.sessionRecorder = this.recorder;
    } else {
      throw new ExistingRecordingError();
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
  public async trial(
    display_element: HTMLElement,
    trial: TrialType<Info>,
  ): Promise<void> {
    display_element.innerHTML = trial.wait_for_connection_message
      ? trial.wait_for_connection_message
      : "Initializing recorder, please wait...";
    await this.recorder
      .start(false, `${StartRecordPlugin.info.name}-multiframe`)
      .then(() => {
        display_element.innerHTML = "";
        this.jsPsych.finishTrial();
      });
  }
}
