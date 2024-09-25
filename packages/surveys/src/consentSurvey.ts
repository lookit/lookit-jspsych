import SurveyPlugin from "@jspsych/plugin-survey";
import { TrialType } from "jspsych";
import { consentSurveyFunction } from "./utils";

type Info = typeof SurveyPlugin.info;
export type Trial = TrialType<Info>;

/** Consent Survey plugin extends jsPsych's Survey Plugin. */
export class ConsentSurveyPlugin extends SurveyPlugin {
  public static readonly info = SurveyPlugin.info;
  /**
   * Custom consent survey function adds functionality before creating a survey
   * based on the user-defined survey JSON/function.
   *
   * @param display_element - Trial display element.
   * @param trial - Info parameters.
   */
  public trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_function: consentSurveyFunction(trial.survey_function),
    });
  }
  /**
   * Add CHS type to experiment data. This will enable Lookit API to run the
   * "consent" Frame Action Dispatcher method after the experiment has
   * completed. It looks like jsPsych uses snake case for these data.
   *
   * @returns Object containing CHS type.
   */
  public static chsData() {
    return { chs_type: "consent" };
  }
}
