import { initJsPsych as origInitJsPsych } from "jspsych";
import { JsPsychOptions } from "./types";
import { on_data_update, on_finish } from "./utils";

function lookitInitJsPsych(responseUuid: string) {
  /**
   * Function that returns a function to replace jsPsych's initJsPsych.
   */
  return function (opts: JsPsychOptions) {
    const jsPsych = origInitJsPsych({
      ...opts,
      on_data_update: on_data_update(responseUuid, opts?.on_data_update),
      on_finish: on_finish(responseUuid, opts?.on_finish),
    });
    const origJsPsychRun = jsPsych.run;

    jsPsych.run = async function (timeline) {
      // check timeline here...
      return origJsPsychRun(timeline);
    };

    return jsPsych;
  };
}

export default lookitInitJsPsych;
