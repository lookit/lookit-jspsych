import { DataCollection } from "jspsych/dist/modules/data/DataCollection";
import Api from "../../data/dist";
import { ResponseData, UserFunc } from "./types";

const controller = new AbortController();

export function csrfToken() {
  /**
   * Function to get csrf token from cookies.
   */
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1] ?? ""
  );
}

export async function get(url: string) {
  /**
   * Function for REST get.
   */
  const request = new Request(url, {
    method: "GET",
    mode: "same-origin",
  });

  const response = await fetch(request);
  if (response.ok) {
    return response.json();
  }
}

export async function patch(
  url: string,
  use_signal: boolean,
  data: ResponseData,
) {
  /**
   * Function for REST patch.
   */
  const request = new Request(url, {
    method: "PATCH",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/vnd.api+json",
    },
    mode: "same-origin", // Do not send CSRF token to another domain.
    signal: use_signal ? controller.signal : undefined,
    body: JSON.stringify({ data }),
  });

  const response = await fetch(request);
  if (response.ok) {
    return response.json();
  }
}

export function on_data_update(responseUuid: string, userFunc?: UserFunc) {
  /**
   * Function that returns a function to be used in place of jsPsych's option
   * "on_data_update".  "userFunc" should be the user's implementation of
   * "on_data_update".  Since this is the data that is returned from each
   * trial, this function will get the collected trial data and append the
   * current data point.
   */
  return async function (data: DataCollection) {
    const response = await Api.retreiveResponse(responseUuid);
    const exp_data = response.attributes.exp_data
      ? response.attributes.exp_data
      : [];
    response.attributes.exp_data = [...exp_data, data];

    await Api.updateResponse(
      responseUuid,
      {
        exp_data: [...exp_data, data],
      },
      controller,
    );

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
    /**
     * The on_data_update and on_finish functions aren't called as async
     * functions.  This means that each function isn't completed before the
     * next is ran. To handle this, we're going to abort the patch function
     * in on_data_update.  This will cause a reliable error,
     */
    const { exit_url } = window.chs.study.attributes;

    controller.abort("Writing final response data.");

    await Api.updateResponse(responseUuid, {
      exp_data: data.values(),
      completed: true,
    });

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    exit_url && window.location.replace(exit_url);
  };
}
