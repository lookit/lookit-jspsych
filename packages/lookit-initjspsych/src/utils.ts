import Api from "@lookit/data";
import { JsPsychExpData, LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { DataCollection, JsPsych } from "jspsych";
import { NoJsPsychInstanceError } from "./errors";
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

    await Api.updateResponse(responseUuid, {
      exp_data: jsPsychInstance.data.get().values() as JsPsychExpData[],
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
 * @param jsPsychInstance - JsPsych instance
 * @param responseUuid - Response UUID.
 * @param userFunc - "on finish" function provided by the researcher.
 * @returns On finish function.
 */
export const on_finish = (
  jsPsychInstance: JsPsych | undefined | null,
  responseUuid: string,
  userFunc?: UserFuncOnFinish,
) => {
  return async function (data: DataCollection) {
    // add loading animation while data/video saving finishes
    if (!jsPsychInstance || !jsPsychInstance.getDisplayElement) {
      throw new NoJsPsychInstanceError();
    }
    jsPsychInstance.getDisplayElement().innerHTML =
      chsTemplates.loadingAnimation();

    const exp_data: JsPsychExpData[] = data.values();

    const { exit_url } = window.chs.study.attributes;

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    try {
      await Api.updateResponse(responseUuid, {
        exp_data,
        completed: true,
      });
      await Api.finish();
      if (window.chs.pendingUploads) {
        await Promise.allSettled(
          window.chs.pendingUploads.map((u) => u.promise),
        );
      }
      if (exit_url) {
        let url: URL;
        try {
          url = new URL(exit_url);
        } catch {
          try {
            url = new URL(`https://${exit_url}`);
          } catch {
            url = new URL(window.location.origin);
          }
        }
        const hash_child_id = window.chs.response.attributes.hash_child_id;
        if (hash_child_id) url.searchParams.set("child", hash_child_id);
        url.searchParams.set("response", window.chs.response.id);
        window.location.replace(url.toString());
      }
    } catch (err) {
      console.error(
        "Error while finishing the experiment and saving data/video: ",
        err,
      );
    }
  };
};
