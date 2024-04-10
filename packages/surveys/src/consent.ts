import { TrialType } from "jspsych";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey/dist";
import { consent_survey_function as survey_function } from "./utils";

const info = <const>{
  ...SurveyPlugin.info,
};

type Info = typeof info;
type Trial = TrialType<Info>;

export class ConsentSurveyPlugin extends SurveyPlugin {
  static readonly info = info;
  trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_function: survey_function(trial.survey_function),
    });
  }
}
