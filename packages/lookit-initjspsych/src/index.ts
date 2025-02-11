import { initJsPsych as origInitJsPsych } from "jspsych";
import { UndefinedTypeError } from "./errors";
import { ChsTrialDescription, JsPsychOptions } from "./types";
import { on_data_update, on_finish } from "./utils";

/**
 * Search timeline object for the method "chsData". When found, add to timeline
 * data parameter. This will inject values into the experiment to be parsed chs
 * after experiment has completed.
 *
 * @param t - Timeline object.
 */
const addChsData = (t: ChsTrialDescription) => {
  if (t.type.chsData) {
    t.data = { ...t.data, ...t.type.chsData() };
  }
};

/**
 * Function that returns a function to replace jsPsych's initJsPsych.
 *
 * @param responseUuid - Response UUID.
 * @returns InitJsPsych function.
 */
const lookitInitJsPsych = (responseUuid: string) => {
  return function (opts: JsPsychOptions) {
    const jsPsych = origInitJsPsych({
      ...opts,
      on_data_update: on_data_update(responseUuid, opts?.on_data_update),
      on_finish: on_finish(responseUuid, opts?.on_finish),
    });
    const origJsPsychRun = jsPsych.run;

    /**
     * Overriding default jsPsych run function. This will allow us to
     * check/alter the timeline before running an experiment.
     *
     * @param timeline - List of jsPsych trials.
     * @returns Original jsPsych run function.
     */
    jsPsych.run = function (timeline) {
      // check timeline here...
      timeline.map((t: ChsTrialDescription, idx: number) => {
        if (!t.type) {
          throw new UndefinedTypeError(idx);
        }
        addChsData(t);
      });

      return origJsPsychRun(timeline);
    };

    return jsPsych;
  };
};

export default lookitInitJsPsych;
