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
    locale: { type: ParameterType.STRING, default: "en-us" },
  },
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
    display_element.innerHTML = chsTemplates.uploadingVideo(trial);
    this.recorder.stop().then(() => {
      window.chs.sessionRecorder = null;
      display_element.innerHTML = "";
      this.jsPsych.finishTrial();
    });
  }
}
