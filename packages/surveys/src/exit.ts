import { ParameterType, TrialType } from "jspsych";
import { Model } from "survey-jquery";
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
    const survey_elements = surveyJSON.pages[0].elements;
    const databrary_share_element_idx = survey_elements.findIndex(
      (element) => element.name === "databraryShare",
    );
    survey_elements.splice(databrary_share_element_idx, 1);
  }
}

function includeWithdrawalExample(trial: Trial) {
  const study = window.chs.study;
  const withdrawal_element = surveyJSON.pages[0].elements.find(
    (element) => element.name === "withdrawal",
  );
  const example = trial.include_withdrawal_example
    ? " (your spouse was discussing state secrets in the background, etc.)"
    : "";

  withdrawal_element &&
    Object.assign(withdrawal_element, {
      choices: [
        {
          text: `Every video helps us, even if something went wrong! However, if you need your video deleted${example}, check here to completely withdraw your video data from this session from the study. Only your consent video will be retained and it may only be viewed by Lookit project staff and researchers working with ${study.attributes.contact_info} on the study "${study.attributes.name}"; other video will be deleted without viewing.`,
          value: true,
        },
      ],
    });
}

function additionalVideoPrivacyText(trial: Trial) {
  const element = surveyJSON.pages[0].elements.find(
    (element) => element.name === "privacy",
  );
  element &&
    Object.assign(element, {
      description: trial.additional_video_privacy_text,
    });
}

function privateLevelOnly(trial: Trial) {
  if (trial.private_level_only) {
    const media_use_element = surveyJSON.pages[0].elements.find(
      (element) => element.name === "useOfMedia",
    );
    media_use_element &&
      Object.assign(media_use_element, {
        defaultValue: "private",
        description:
          "Your video data is private and may only be viewed by authorized scientists.",
        choicesVisibleIf: "false", // this must be a string expression
        isRequired: false,
      });
  }
}

function surveyParameters(trial: Trial) {
  [
    showDatabraryOptions,
    includeWithdrawalExample,
    additionalVideoPrivacyText,
    privateLevelOnly,
  ].map((fn) => fn(trial));
  return JSON.stringify(surveyJSON);
}

function exit_survey_function(survey: Model) {
  survey_function(survey);
  // For the withdrawal checkbox question, this takes the boolean response value out of an array
  // and saves it as a single value (since there is always only one checkbox).
  // We went with the checkbox question type rather than boolean with "renderAs: checkbox" because the
  // latter doesn't allow both a question title and label next to the checkbox.
  survey.onComplete.add(function (sender) {
    const trueFalseValue =
      sender.getQuestionByName("withdrawal").value.length > 0 ? true : false;
    sender.setValue("withdrawal", trueFalseValue);
  });
}

export class ExitSurveyPlugin extends SurveyPlugin {
  static readonly info = info;
  trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_json: surveyParameters(trial),
      survey_function: exit_survey_function,
    });
  }
}
