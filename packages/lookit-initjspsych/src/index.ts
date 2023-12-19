import { initJsPsych as origInitJsPsych } from "jspsych";
import { DataCollection } from "jspsych/dist/modules/data/DataCollection";
import { v4 } from "uuid";

type UUID = typeof v4;
type ResponseData = {
  id: UUID;
  type: "responses";
  attributes: {
    exp_data: DataCollection[];
    completed?: boolean;
  };
};
type UserFunc = (data: DataCollection) => void | undefined;
type JsPsychOptions = {
  on_data_update: UserFunc;
  on_finish: UserFunc;
};

const controller = new AbortController();

function csrfToken() {
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

async function get(url: string) {
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

async function patch(url: string, use_signal: boolean, data: ResponseData) {
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

function on_data_update(responseApiUrl: string, id: UUID, userFunc: UserFunc) {
  /**
   * Function that returns a function to be used in place of jsPsych's option
   * "on_data_update".  "userFunc" should be the user's implementation of
   * "on_data_update".  Since this is the data that is returned from each
   * trial, this function will get the collected trial data and append the
   * current data point.
   */
  return async function (data: DataCollection) {
    const {
      data: {
        attributes: { exp_data },
      },
    } = await get(responseApiUrl);

    await patch(responseApiUrl, true, {
      id,
      type: "responses",
      attributes: {
        exp_data: [...exp_data, data],
      },
    });

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }
  };
}

function on_finish(
  responseApiUrl: string,
  id: UUID,
  exitUrl: string,
  userFunc: UserFunc,
) {
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
    controller.abort("Writing final response data.");

    await patch(responseApiUrl, false, {
      id,
      type: "responses",
      attributes: {
        exp_data: data.values(),
        completed: true,
      },
    });

    // Don't call the function if not defined by user.
    if (typeof userFunc === "function") {
      userFunc(data);
    }

    window.location.replace(exitUrl);
  };
}

function lookitInitJsPsych(
  responseApiUrl: string,
  responseUuid: UUID,
  exitUrl: string,
) {
  /**
   * Function that returns a function to replace jsPsych's initJsPsych.
   */
  return function (opts: JsPsychOptions) {
    const jsPsych = origInitJsPsych({
      ...opts,
      on_data_update: on_data_update(
        responseApiUrl,
        responseUuid,
        opts?.on_data_update,
      ),
      on_finish: on_finish(
        responseApiUrl,
        responseUuid,
        exitUrl,
        opts?.on_finish,
      ),
    });
    const origJsPsychRun = jsPsych.run;

    jsPsych.run = async function (timeline) {
      // check timeline here...
      return origJsPsychRun(timeline);
    };

    return jsPsych;
  };
}

export default lookitInitJsPsych;
