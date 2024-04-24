import Api from "@lookit/data";
import { DataCollection } from "jspsych/dist/modules/data/DataCollection";
import { UserFunc } from "./types";

export function on_data_update(responseUuid: string, userFunc?: UserFunc) {
  /**
   * Function that returns a function to be used in place of jsPsych's option
   * "on_data_update".  "userFunc" should be the user's implementation of
   * "on_data_update".  Since this is the data that is returned from each
   * trial, this function will get the collected trial data and append the
   * current data point.
   */
  return async function (data: DataCollection) {
    const { attributes } = await Api.retrieveResponse(responseUuid);
    const exp_data = attributes.exp_data ? attributes.exp_data : [];

    await Api.updateResponse(responseUuid, {
      exp_data: [...exp_data, data],
    });

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }
  };
}

export function on_finish(responseUuid: string, userFunc?: UserFunc) {
  /**
   * Function that returns a function to be used in place of jsPsych's option
   * "on_finish".  "userFunc" should be the user's implementation of
   * "on_finish".  Since this is point where the experiment has ended, the
   * function will set "completed" to true and overwrites all experiment data
   * with the full set of collected data.  Once the user function has been
   * ran, this will redirect to the study's exit url.
   */
  return async function (data: DataCollection) {
    const { exit_url } = window.chs.study.attributes;

    await Api.finish();
    await Api.updateResponse(responseUuid, {
      exp_data: data.values(),
      completed: true,
    });
    await Api.finish();

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    exit_url && window.location.replace(exit_url);
  };
}
