import {
  finish,
  retrieveChild,
  retrievePastSessions,
  retrieveResponse,
  retrieveStudy,
  updateResponse,
} from "./api";

import s3 from "./s3";
import { Child, PastSession, Response, Study } from "./types";

declare global {
  interface Window {
    chs: {
      study: Study;
      child: Child;
      pastSessions: PastSession[];
      response: Response;
    };
  }
}

/**
 * Load data from API that would be used by researchers and jsPsych.
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
      },
    });
    deepFreeze(window.chs);
    await finish();
  }
};

export default { load, retrieveResponse, updateResponse, finish, s3 };
