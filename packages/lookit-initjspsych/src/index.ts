import { initJsPsych as origInitJsPsych } from "jspsych";
import { JsPsychOptions } from "./types";
import { on_data_update, on_finish } from "./utils";

function lookitInitJsPsych(
  responseApiUrl: string,
  responseUuid: string,
  exitUrl: string,
) {
  /**
   * Function that returns a function to replace jsPsych's initJsPsych.
   */
  return function (opts: JsPsychOptions) {
    const jsPsych = origInitJsPsych({
      ...opts,
      on_data_update: on_data_update(
        responseApiUrl,
        responseUuid,
        opts?.on_data_update,
      ),
      on_finish: on_finish(
        responseApiUrl,
        responseUuid,
        exitUrl,
        opts?.on_finish,
      ),
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
