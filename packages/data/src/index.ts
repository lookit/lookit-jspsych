//import deepFreeze from "deep-freeze-es6";
import {
  finish,
  retrieveChild,
  retrievePastSessions,
  retrieveResponse,
  retrieveStudy,
  updateResponse,
} from "./api";

import LookitS3 from "./lookitS3";
import { LookitWindow } from "./types";

declare const window: LookitWindow;

/**
 * Load data from API that is needed for saving the experiment data, and that
 * might be needed by researchers and jsPsych.
 *
 * @param response_uuid - Response UUID.
 */
const load = async (response_uuid: string) => {
  if (!window.chs) {
    Object.assign(window, {
      chs: {
        study: await retrieveStudy(),
        child: await retrieveChild(),
        pastSessions: await retrievePastSessions(response_uuid),
        response: await retrieveResponse(response_uuid),
        sessionRecorder: undefined,
      },
    });
    //deepFreeze(window.chs);
    await finish();
  }
};

export default { load, retrieveResponse, updateResponse, finish, LookitS3 };
