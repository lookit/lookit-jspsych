import Data from "@lookit/data";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Model } from "survey-jquery";

const CONFIG = <const>{
  marked: { async: false },
  dompurify: { USE_PROFILES: { html: true } },
};

/**
 * Add markdown transcoding to survey text.
 *
 * @param survey - Survey model provided by SurveyJS.
 * @returns Survey model.
 */
export const textMarkdownSurveyFunction = (survey: Model) => {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set the type as "string" because async is false.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text, CONFIG.marked) as string,
      CONFIG.dompurify,
    );
  });
  return survey;
};

/**
 * Survey function used in exit survey. Adds markdown support through
 * "textMarkdownSurveyFunction". For the withdrawal checkbox question, this
 * takes the boolean response value out of an array and saves it as a single
 * value (since there is always only one checkbox). We went with the checkbox
 * question type rather than boolean with "renderAs: checkbox" because the
 * latter doesn't allow both a question title and label next to the checkbox.
 *
 * @param survey - Survey model provided by SurveyJS.
 * @returns Survey model.
 */
export const exitSurveyFunction = (survey: Model) => {
  textMarkdownSurveyFunction(survey);

  survey.onComplete.add((sender) => {
    const trueFalseValue =
      sender.getQuestionByName("withdrawal").value.length > 0;
    sender.setValue("withdrawal", trueFalseValue);
  });
  return survey;
};

/**
 * Survey function used by Consent Survey. Adds markdown support through
 * "textMarkdownSurveyFunction". On complete, this will mark in the Response
 * that consent was completed, and that the consent was through a survey (rather than video).
 *
 * @param userfn - Survey function provided by user.
 * @returns Survey model.
 */
export const consentSurveyFunction = (userfn?: (x: Model) => Model) => {
  return function (survey: Model) {
    textMarkdownSurveyFunction(survey);

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
};
