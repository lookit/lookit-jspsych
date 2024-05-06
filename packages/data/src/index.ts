import deepFreeze from "deep-freeze-es6";
import {
  finish,
  retrieveChild,
  retrievePastSessions,
  retrieveResponse,
  retrieveStudy,
  updateResponse,
} from "./api";
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

async function load(response_uuid: string) {
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
  }
}

export default { load, retrieveResponse, updateResponse, finish };
