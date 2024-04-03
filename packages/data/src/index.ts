import {
  retreiveResponse,
  retreiveStudy,
  retrieveChild,
  retrievePastSessions,
  updateResponse,
} from "./api";
import { Child, PastSession, Study } from "./types";

declare global {
  interface Window {
    chs: {
      study: Study;
      child: Child;
      pastSessions: PastSession[];
    };
  }
}

async function load(response_uuid: string) {
  console.log("Loading data...");
  !window.chs &&
    Object.assign(window, {
      chs: {
        study: await retreiveStudy(),
        child: await retrieveChild(),
        pastSessions: await retrievePastSessions(response_uuid),
      },
    });
  console.log("Data loaded.");
}

export default { load, retreiveResponse, updateResponse };
