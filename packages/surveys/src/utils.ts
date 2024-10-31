import Data from "@lookit/data";
import { LookitWindow } from "@lookit/data/dist/types";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Model } from "survey-core";
import "survey-core/survey.i18n";
import { Trial as ConsentSurveyTrial } from "./consentSurvey";
import { TrialLocaleParameterUnset } from "./errors";
import { Trial as ExitSurveyTrial } from "./exitSurvey";

declare let window: LookitWindow;

type LocaleTrial = ConsentSurveyTrial | ExitSurveyTrial;

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
 * Set locale parameter on SurveyJS Model.
 *
 * @param survey - SurveyJS model
 * @param trial - Trial data including user supplied parameters.
 */
const setSurveyLocale = (survey: Model, trial: LocaleTrial) => {
  if (!trial.locale) {
    throw new TrialLocaleParameterUnset();
  }
  survey.locale = new Intl.Locale(trial.locale).baseName;
};

/**
 * Survey function used in exit survey. Adds markdown support through
 * "textMarkdownSurveyFunction". For the withdrawal checkbox question, this
 * takes the boolean response value out of an array and saves it as a single
 * value (since there is always only one checkbox). We went with the checkbox
 * question type rather than boolean with "renderAs: checkbox" because the
 * latter doesn't allow both a question title and label next to the checkbox.
 *
 * @param trial - Trial data including user supplied parameters.
 * @returns Survey model.
 */
export const exitSurveyFunction =
  (trial: ExitSurveyTrial) => (survey: Model) => {
    setSurveyLocale(survey, trial);
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
 * that consent was completed, and that the consent was through a survey (rather
 * than video).
 *
 * @param trial - Trial data including user supplied parameters.
 * @returns Survey model.
 */
export const consentSurveyFunction =
  (trial: ConsentSurveyTrial) => (survey: Model) => {
    setSurveyLocale(survey, trial);
    textMarkdownSurveyFunction(survey);

    survey.onComplete.add(async () => {
      await Data.updateResponse(window.chs.response.id, {
        survey_consent: true,
        completed_consent_frame: true,
      });
    });

    if (typeof trial.survey_function === "function") {
      trial.survey_function(survey);
    }

    return survey;
  };
