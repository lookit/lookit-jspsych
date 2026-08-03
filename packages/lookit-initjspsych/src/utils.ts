import Api from "@lookit/data";
import { JsPsychExpData, LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { DataCollection, JsPsych } from "jspsych";
import { NoJsPsychInstanceError } from "./errors";
import { UserFuncOnDataUpdate, UserFuncOnFinish } from "./types";

declare let window: LookitWindow;

/**
 * Retry an async function with exponential backoff. Used for API calls we
 * cannot afford to silently give up on (e.g. persisting the final response
 * data), where we'd rather make the participant wait than lose data.
 *
 * @param fn - Function returning the promise to retry on failure.
 * @param options - Retry configuration.
 * @param options.retries - Max number of retry attempts after the first try.
 * @param options.baseDelayMs - Delay before the first retry; doubles each
 *   subsequent attempt.
 * @returns Resolved value of fn(), once it succeeds.
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 1000,
  }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * 2 ** attempt),
      );
    }
  }
};

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

    // Persist the final response data (including completed: true). This is
    // retried with backoff rather than given up on after one failure. Note this
    // always sends the *complete* exp_data array, so a successful retry here
    // also recovers from any earlier trial's on_data_update having failed.
    //
    // Known quirk: exp_data and completed: true are written together in a
    // single final request. If this update fails after all retries, it's possible
    // for the full data set to have been saved by an earlier (un-awaited)
    // on_data_update even though the response is not marked completed: true. We
    // accept this because having the full data matters more than the completed flag,
    //  and researchers can manually override the tallied status. Decided NOT to
    // fall back to a {completed:true}-only update here because prior
    // on_data_update saves aren't awaited and so can't be assumed successful.
    try {
      await retryWithBackoff(() =>
        Api.updateResponse(responseUuid, {
          exp_data,
          completed: true,
        }),
      );
      await Api.finish();
    } catch (err) {
      console.error(
        "Error while saving final response data after retries: ",
        err,
      );
    }

    // Wait for pending recording uploads independently of the response data
    // update, so a failure/retry exhaustion in one doesn't prevent us from
    // waiting on (and finding out about) the other. (Note that pending uploads
    // will still be uploading during the response-data-saving wait time,
    // this just waits further for any upload requests that are still pending
    // after response data saving is complete.)
    try {
      if (window.chs.pendingUploads) {
        const results = await Promise.allSettled(
          window.chs.pendingUploads.map((u) => u.promise),
        );
        results.forEach((result, i) => {
          if (result.status === "rejected") {
            console.error(
              `Pending upload failed for "${window.chs.pendingUploads[i].file}": `,
              result.reason,
            );
          }
        });
      }
    } catch (err) {
      console.error("Error while waiting for pending uploads: ", err);
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
  };
};
