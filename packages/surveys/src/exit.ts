import { ParameterType, TrialType } from "jspsych";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey/dist";
import surveyJSON from "./survey.json";
import { survey_function } from "./utils";

const info = <const>{
  ...SurveyPlugin.info,
  parameters: {
    ...SurveyPlugin.info.parameters,
    show_databrary_options: {
      type: ParameterType.BOOL,
      default: true,
      pretty_name: "Show databrary options",
    },
    include_withdrawal_example: {
      type: ParameterType.BOOL,
      default: true,
      pretty_name: "Include withdrawal example",
    },
    private_level_only: {
      type: ParameterType.BOOL,
      default: false,
      pretty_name: "Private level only",
    },
    additional_video_privacy_text: {
      type: ParameterType.STRING,
      default: "",
      pretty_name: "Additional video privacy text",
    },
  },
};

type Info = typeof info;
type Trial = TrialType<Info>;

function showDatabraryOptions(trial: Trial) {
  if (!trial.show_databrary_options) {
    const elements = surveyJSON.pages[0].elements;
    const idx = elements.findIndex((element) => element.name === "databrary");
    elements.splice(idx, 1);
  }
}

function additionalVideoPrivacyText(trial: Trial) {
  const element = surveyJSON.pages[0].elements.find(
    (element) => element.name === "privacy",
  );
  if (element) {
    Object.assign(element, {
      description: trial.additional_video_privacy_text,
    });
  }
}

function surveyParameters(trial: Trial) {
  showDatabraryOptions(trial);
  additionalVideoPrivacyText(trial);
  return JSON.stringify(surveyJSON);
}

export class ExitSurveyPlugin extends SurveyPlugin {
  static info = info;
  trial(display_element: HTMLElement, trial: Trial) {
    return super.trial(display_element, {
      ...trial,
      survey_json: surveyParameters(trial),
      survey_function,
      validation_function: () => null,
    });
  }
}
