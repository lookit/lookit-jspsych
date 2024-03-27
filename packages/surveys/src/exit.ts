import { ParameterType, TrialType } from "jspsych";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey/dist";
import newJSON from "./new.json";
import surveyJSON from "./survey.json";
import { survey_function } from "./utils";

const info = <const>{
  name: SurveyPlugin.info.name,
  parameters: {
    ...SurveyPlugin.info.parameters,
    new_value: {
      type: ParameterType.STRING,
      default: "",
      pretty_name: "Validation function",
    },
  },
};

type Info = typeof info;

function updateQuestions(trial: TrialType<Info>) {
  if (trial.new_value) {
    surveyJSON.pages[0].elements.push(newJSON);
  }
  return JSON.stringify(surveyJSON);
}

export class ExitSurveyPlugin extends SurveyPlugin {
  static info = info;
  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const survey_json = updateQuestions(trial);
    return super.trial(display_element, {
      ...trial,
      survey_json,
      survey_function,
      validation_function: () => null,
    });
  }
}
