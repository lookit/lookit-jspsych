import Api from "@lookit/data";
import { LookitWindow } from "@lookit/data/dist/types";
import { DataCollection } from "jspsych/dist/modules/data/DataCollection";
import { UserFunc } from "./types";

declare let window: LookitWindow;

/**
 * Function that returns a function to be used in place of jsPsych's option
 * "on_data_update". "userFunc" should be the user's implementation of
 * "on_data_update". Since this is the data that is returned from each trial,
 * this function will get the collected trial data and append the current data
 * point.
 *
 * @param responseUuid - Response UUID.
 * @param userFunc - "on data update" function provided by researcher.
 * @returns On data update function.
 */
export const on_data_update = (responseUuid: string, userFunc?: UserFunc) => {
  return async function (data: DataCollection) {
    const { attributes } = await Api.retrieveResponse(responseUuid);
    const exp_data = attributes.exp_data ? attributes.exp_data : [];

    await Api.updateResponse(responseUuid, {
      exp_data: [...exp_data, data],
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
export const on_finish = (responseUuid: string, userFunc?: UserFunc) => {
  return async function (data: DataCollection) {
    const { exit_url } = window.chs.study.attributes;

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    await Api.finish();
    await Api.updateResponse(responseUuid, {
      exp_data: data.values(),
      completed: true,
    });

    exit_url && window.location.replace(exit_url);
  };
};
