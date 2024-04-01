import Data from "@lookit/data";
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

export function text_markdown_survey_function(survey: Model) {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set the type as "string" because async is false.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text, CONFIG.marked) as string,
      CONFIG.dompurify,
    );
  });
  return survey;
}

export function exit_survey_function(survey: Model) {
  text_markdown_survey_function(survey);
  // For the withdrawal checkbox question, this takes the boolean response value out of an array
  // and saves it as a single value (since there is always only one checkbox).
  // We went with the checkbox question type rather than boolean with "renderAs: checkbox" because the
  // latter doesn't allow both a question title and label next to the checkbox.
  survey.onComplete.add((sender) => {
    const trueFalseValue =
      sender.getQuestionByName("withdrawal").value.length > 0;
    sender.setValue("withdrawal", trueFalseValue);
  });
  return survey;
}

export function consent_survey_function(userfn?: (x: Model) => Model) {
  return function (survey: Model) {
    text_markdown_survey_function(survey);

    survey.onComplete.add(async () => {
      await Data.updateResponse(window.chs.response.id, {
        survey_consent: true,
        completed_consent_frame: true,
      });
    });

    if (typeof userfn === "function") {
      userfn(survey);
    }

    return survey;
  };
}
