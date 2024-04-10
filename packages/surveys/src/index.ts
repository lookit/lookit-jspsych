import { Child, PastSession, Response, Study } from "@lookit/data/dist/types";
import { ConsentSurveyPlugin } from "./consent";
import { ExitSurveyPlugin } from "./exit";

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

export default { exit: ExitSurveyPlugin, consent: ConsentSurveyPlugin };
