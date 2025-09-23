import Api from "@lookit/data";
import { JsPsychExpData, LookitWindow } from "@lookit/data/dist/types";
import { DataCollection, JsPsych } from "jspsych";
import { NoJsPsychInstanceError, SequenceExpDataError } from "./errors";
import { UserFuncOnDataUpdate, UserFuncOnFinish } from "./types";

declare let window: LookitWindow;

/**
 * Function that returns a function to be used in place of jsPsych's option
 * "on_data_update". "userFunc" should be the user's implementation of
 * "on_data_update". Since this is the data that is returned from each trial,
 * this function will get the collected trial data and append the current data
 * point.
 *
 * @param jsPsychInstance - JsPsych instance
 * @param responseUuid - Response UUID.
 * @param userFunc - "on data update" function provided by researcher.
 * @returns On data update function.
 */
export const on_data_update = (
  jsPsychInstance: JsPsych | undefined | null,
  responseUuid: string,
  userFunc?: UserFuncOnDataUpdate,
) => {
  return async function (data: JsPsychExpData) {
    if (!jsPsychInstance || !jsPsychInstance.data) {
      throw new NoJsPsychInstanceError();
    }

    const { attributes } = await Api.retrieveResponse(responseUuid);
    const sequence = attributes.sequence ? attributes.sequence : [];

    await Api.updateResponse(responseUuid, {
      exp_data: jsPsychInstance.data.get().values() as JsPsychExpData[],
      sequence: [...sequence, `${data.trial_index}-${data.trial_type}`],
    });
    await Api.finish();

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }
  };
};

/**
 * Function that returns a function to be used in place of jsPsych's option
 * "on_finish". "userFunc" should be the user's implementation of "on_finish".
 * Since this is point where the experiment has ended, the function will set
 * "completed" to true and overwrites all experiment data with the full set of
 * collected data. Once the user function has been ran, this will redirect to
 * the study's exit url.
 *
 * @param responseUuid - Response UUID.
 * @param userFunc - "on finish" function provided by the researcher.
 * @returns On finish function.
 */
export const on_finish = (
  responseUuid: string,
  userFunc?: UserFuncOnFinish,
) => {
  return async function (data: DataCollection) {
    const {
      attributes: { sequence },
    } = await Api.retrieveResponse(responseUuid);

    const exp_data: JsPsychExpData[] = data.values();

    if (!Array.isArray(sequence)) {
      throw new SequenceExpDataError();
    }

    const { exit_url } = window.chs.study.attributes;
    const last_exp = exp_data[exp_data.length - 1];

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    await Api.updateResponse(responseUuid, {
      exp_data,
      sequence: [...sequence, `${last_exp.trial_index}-${last_exp.trial_type}`],
      completed: true,
    })
      .then(() => Api.finish())
      .then(() => exit_url && window.location.replace(exit_url));
  };
};
