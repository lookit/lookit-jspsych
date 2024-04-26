import { initJsPsych as origInitJsPsych } from "jspsych";
import { JsPsychOptions } from "./types";
import { on_data_update, on_finish } from "./utils";

/**
 * Function that returns a function to replace jsPsych's initJsPsych.
 *
 * @param responseUuid - Response UUID.
 * @returns InitJsPsych function.
 */
function lookitInitJsPsych(responseUuid: string) {
  return function (opts: JsPsychOptions) {
    const jsPsych = origInitJsPsych({
      ...opts,
      on_data_update: on_data_update(responseUuid, opts?.on_data_update),
      on_finish: on_finish(responseUuid, opts?.on_finish),
    });
    const origJsPsychRun = jsPsych.run;

    /**
     * Overriding default jsPsych run function. With will allow us to
     * check/alter the timeline before running an experiment.
     *
     * @param timeline - List of jsPysch trials.
     * @returns Original jsPsych run function.
     */
    jsPsych.run = function (timeline) {
      // check timeline here...
      return origJsPsychRun(timeline);
    };

    return jsPsych;
  };
}

export default lookitInitJsPsych;
