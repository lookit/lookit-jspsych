import data from "@lookit/data";
import { TrialType } from "jspsych";
import { Model } from "survey-jquery";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey/dist";

const info = <const>{
  ...SurveyPlugin.info,
};

type Info = typeof info;
type Trial = TrialType<Info>;

function survey_function(survey: Model) {
  survey.onComplete.add(async () => {
    await data.updateResponse(window.chs.response.id, { survey_consent: true });
  });
  return survey;
}

export class ConsentSurveyPlugin extends SurveyPlugin {
  static readonly info = info;
  trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_function,
    });
  }
}
