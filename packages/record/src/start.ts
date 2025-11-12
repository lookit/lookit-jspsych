import { LookitWindow } from "@lookit/data/dist/types";
import { JsPsych, JsPsychPlugin } from "jspsych";
import { version } from "../package.json";
import { ExistingRecordingError } from "./errors";
import Recorder from "./recorder";

declare let window: LookitWindow;

const info = <const>{
  name: "start-record-plugin",
  version,
  parameters: {},
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

  /** Trial function called by jsPsych. */
  public trial() {
    this.recorder
      .start(false, `${StartRecordPlugin.info.name}-multiframe`)
      .then(() => {
        this.jsPsych.finishTrial();
      });
  }
}
