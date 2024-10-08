import { LookitWindow } from "@lookit/data/dist/types";
import { JsPsych, JsPsychPlugin } from "jspsych";
import uploadingVideo from "../templates/uploading-video.hbs";
import { NoSessionRecordingError } from "./errors";
import Recorder from "./recorder";
import Handlebars = require("handlebars");

declare let window: LookitWindow;

const info = <const>{ name: "stop-record-plugin", parameters: {} };
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
   */
  public trial(display_element: HTMLElement): void {
    display_element.innerHTML = Handlebars.compile(uploadingVideo)({});
    this.recorder.stop().then(() => {
      window.chs.sessionRecorder = null;
      display_element.innerHTML = "";
      this.jsPsych.finishTrial();
    });
  }
}
