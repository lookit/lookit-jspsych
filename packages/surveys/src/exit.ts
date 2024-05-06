import SurveyPlugin from "@jspsych/plugin-survey";
import { ParameterType, TrialType } from "jspsych";
import { surveyJSON } from "./exit_json";
import { exit_survey_function as survey_function } from "./utils";

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
  return surveyJSON;
}

export class ExitSurveyPlugin extends SurveyPlugin {
  static readonly info = info;
  trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_json: surveyParameters(trial),
      survey_function,
    });
  }
}
