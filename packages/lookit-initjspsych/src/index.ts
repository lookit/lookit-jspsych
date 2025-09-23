import { JsPsychExpData } from "@lookit/data/dist/types";
import type { JsPsych as JsPsychType } from "jspsych";
import * as jspsychModule from "jspsych";
import type { TimelineArray } from "jspsych/src/timeline";
import { UndefinedTimelineError, UndefinedTypeError } from "./errors";
import type {
  ChsJsPsych,
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
  return (
    typeof description === "object" &&
    !isTimelineNodeArray(
      description as ChsTrialDescription | ChsTimelineDescription,
    )
  );
};

/**
 * Function that returns a function to replace jsPsych's initJsPsych.
 *
 * @param responseUuid - Response UUID.
 * @returns InitJsPsych function.
 */
const lookitInitJsPsych = (responseUuid: string) => {
  return function (opts: JsPsychOptions): ChsJsPsych {
    // Omit on_data_update from user-defined options that will be passed into origInitJsPsych.
    // We are using a closure in the on_data_update function so that we can reference the jsPsych instance,
    // and the user-defined function will be passed in through that closure.
    const { on_data_update: userOnDataUpdate, ...otherOpts } = opts || {};

    // Create a placeholder for the instance - needed for use in the onDataUpdate closure.
    let jsPsychInstance: JsPsychType | null = null;

    /**
     * Closure to return the on_data_update function, with the actual instance,
     * once the instance is created.
     *
     * @param args - Arguments passed to onDataUpdate
     * @returns The on_data_update function to be used
     */
    const onDataUpdate = (...args: [JsPsychExpData]) => {
      // Call the custom CHS on_data_update fn with the jsPsych instance, response UUID,
      // and the user-defined on_data_update function if it exists.
      // No checks for jsPsychInstance here because on_data_update handles that.
      return on_data_update(
        jsPsychInstance,
        responseUuid,
        userOnDataUpdate,
      )(...args);
    };

    // Create the jsPsych instance and pass in the callbacks
    const jsPsych = jspsychModule.initJsPsych({
      ...otherOpts,
      on_data_update: onDataUpdate,
      on_finish: on_finish(responseUuid, opts?.on_finish),
    });

    // Now set the instance variable to the actual instance, so that it is referenced inside onDataUpdate.
    jsPsychInstance = jsPsych;

    const origJsPsychRun = jsPsych.run;

    const lookitJsPsych = jsPsych as ChsJsPsych;

    /**
     * Overriding default jsPsych run function. This will allow us to
     * check/alter the timeline before running an experiment.
     *
     * @param timeline - Array of jsPsych trials (descriptions) and/or timeline
     *   nodes (descriptions).
     * @returns Original jsPsych run function.
     */
    lookitJsPsych.run = async function (timeline: ChsTimelineArray) {
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
            if (
              isTimelineNodeArray(
                el as
                  | ChsTrialDescription
                  | ChsTimelineDescription
                  | ChsTimelineArray,
              )
            ) {
              if (Array.isArray(el)) {
                return handleTrialTypes(el as ChsTimelineArray, callback);
              } else if ("timeline" in el && Array.isArray(el.timeline)) {
                const chsTimelineDescription: ChsTimelineDescription = {
                  ...el,
                  timeline: handleTrialTypes(
                    el.timeline as ChsTimelineArray,
                    callback,
                  ),
                };
                return chsTimelineDescription;
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
                const chsTrialDescription =
                  el as unknown as ChsTrialDescription;
                callback(chsTrialDescription);
                return chsTrialDescription;
              } else {
                throw new UndefinedTypeError(el);
              }
            } else {
              throw new UndefinedTimelineError(el);
            }
          },
        ) as ChsTimelineArray;
      };

      // This function takes the CHS-typed timeline passed to our modified jsPsych.run and modifies it by adding data from the chsData function in each trial type.
      const modifiedTimeline: ChsTimelineArray = handleTrialTypes(
        timeline as ChsTimelineArray,
        (trial) => {
          if ("type" in trial) {
            if (trial.type?.chsData) {
              trial.data = { ...trial.data, ...trial.type.chsData() };
            }
          }
        },
      );

      // Convert the CHS-typed timeline array back to the jsPsych-type version for compatibility with the original jsPsych.run function.
      return await origJsPsychRun(modifiedTimeline as TimelineArray);
    };

    return lookitJsPsych;
  };
};

export default lookitInitJsPsych;
