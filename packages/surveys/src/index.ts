import { Child, PastSession, Study } from "@lookit/data/dist/types";
import { ExitSurveyPlugin } from "./exit";

declare global {
  interface Window {
    chs: {
      study: Study;
      child: Child;
      pastSessions: PastSession[];
    };
  }
}

export default { exit: ExitSurveyPlugin };
