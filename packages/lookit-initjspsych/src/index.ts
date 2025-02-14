import { initJsPsych as origInitJsPsych } from "jspsych";
import { TimelineArray } from "jspsych/src/timeline";
import { UndefinedTimelineError, UndefinedTypeError } from "./errors";
import {
  ChsTimelineArray,
  ChsTimelineDescription,
  ChsTrialDescription,
  JsPsychOptions,
} from "./types";
import { on_data_update, on_finish } from "./utils";

/**
 * Checks if the given description is a timeline array or description (node),
 * both of which might contain trial descriptions. Modified from
 * isTimelineDescription in jspsych/src/timeline to exclude trial descriptions
 * with nested timelines (jsPsych returns true for trial description objects
 * that have a "type" property and a nested timelines, but we need to return
 * false.)
 *
 * @param description - The description array or object to check.
 * @returns True if the description is a timeline array or timeline description
 *   (object with "timeline" key but no "type" key), otherwise false.
 */
const isTimelineNodeArray = (
  description: ChsTrialDescription | ChsTimelineDescription | ChsTimelineArray,
) => {
  return (
    (Boolean((description as ChsTimelineDescription).timeline) ||
      Array.isArray(description)) &&
    !(description as ChsTimelineDescription).type
  );
};

/**
 * Checks if the description is an object that contains a "type" key, whose
 * value is a plugin class. Returns true even when the trial object contains a
 * nested timeline. Modified from isTrialDescription in jspsych/src/timeline to
 * return true for trial descriptions with nested timelines.
 *
 * @param description - The description object to check.
 * @returns True if the description is an object with a "type" property,
 *   otherwise false.
 */
const isTrialWithType = (
  description: ChsTrialDescription | ChsTimelineDescription,
) => {
  return typeof description === "object" && !isTimelineNodeArray(description);
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
     * @param timeline - Array of jsPsych trials (descriptions) and/or timeline
     *   nodes (descriptions).
     * @returns Original jsPsych run function.
     */
    jsPsych.run = function (timeline: TimelineArray) {
      /**
       * Iterate over a timeline and recursively locate any trial descriptions
       * (objects with a "type" key, whose value is a plugin class). For each
       * trial description, call the callback function that receives the trial
       * description as an argument.
       *
       * @param timeline - CHS versions of the jsPsych timeline array or
       *   timeline description
       * @param callback - Callback function that handles each plugin class,
       *   which receives as an argument the plugin class from the trial
       *   description "type".
       * @returns Timeline array
       */
      const handleTrialTypes = (
        timeline: ChsTimelineArray | ChsTimelineDescription,
        callback: (trial: ChsTrialDescription) => void,
      ): ChsTimelineArray => {
        return timeline.map(
          (
            el: ChsTimelineDescription | ChsTrialDescription | ChsTimelineArray,
          ) => {
            // First check for timeline descriptions: arrays or objects with 'timeline' key that do not also have a 'type' key.
            if (isTimelineNodeArray(el)) {
              if (Array.isArray(el)) {
                return handleTrialTypes(el, callback);
              } else if ("timeline" in el && Array.isArray(el.timeline)) {
                el.timeline = handleTrialTypes(el.timeline, callback);
                return el;
              } else {
                throw new UndefinedTimelineError(el);
              }
            } else if (
              isTrialWithType(
                el as ChsTimelineDescription | ChsTrialDescription,
              )
            ) {
              // Now handle objects with a 'type' key. This includes trial descriptions with nested timelines, as long as they include a plugin type.
              if (
                el !== null &&
                "type" in el &&
                el.type !== null &&
                el.type !== undefined
              ) {
                callback(el as ChsTrialDescription);
                return el;
              } else {
                throw new UndefinedTypeError(el);
              }
            } else {
              throw new UndefinedTimelineError(el);
            }
          },
        );
      };

      // Note about type conversion here: This function takes the timeline passed to jsPsych.run, so it must be typed as a jsPsych timeline array for compatibility with that original function, but in fact it is the CHS version of the timeline array.
      const modifiedTimeline = handleTrialTypes(
        timeline as ChsTimelineArray | ChsTimelineDescription,
        (trial) => {
          // Search timeline object for the method "chsData". When found, add to timeline data parameter. This will inject values into the experiment to be parsed chs after experiment has completed.
          if ("type" in trial) {
            if (trial.type?.chsData) {
              trial.data = { ...trial.data, ...trial.type.chsData() };
            }
          }
        },
      );

      // Note about type conversion here: We need to convert the CHS-typed (extended) timeline array back to the jsPsych-typed version for compatibility with the original jsPsych.run function.
      return origJsPsychRun(modifiedTimeline as TimelineArray);
    };

    return jsPsych;
  };
};

export default lookitInitJsPsych;
