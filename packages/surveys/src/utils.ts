import Api from "@lookit/lookit-api";
import { Study } from "@lookit/lookit-api/dist/types";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Model } from "survey-jquery";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey/dist";

declare global {
  interface Window {
    lookit: {
      study: Study;
    };
  }
}

const CONFIG = <const>{
  marked: { async: false },
  dompurify: { USE_PROFILES: { html: true } },
};

export function survey_function(survey: Model) {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set the type as "string" because async is false.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text, CONFIG.marked) as string,
      CONFIG.dompurify,
    );
  });
  return survey;
}

export class LookitAPISurveyPlugin extends SurveyPlugin {
  async lookitData() {
    !window.lookit &&
      Object.assign(window, {
        lookit: {
          study: await Api.retreiveStudy(),
        },
      });
  }
}
