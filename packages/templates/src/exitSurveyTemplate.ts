import { LookitWindow } from "@lookit/data/dist/types";
import i18next from "i18next";
import { PluginInfo, TrialType } from "jspsych";
import { setLocale } from "./utils";

declare const window: LookitWindow;

const names = <const>{
  birthDate: "birthDate",
  databraryShare: "databraryShare",
  useOfMedia: "useOfMedia",
  withdrawal: "withdrawal",
  feedback: "feedback",
};

const survey = {
  pages: [
    {
      elements: [
        {
          description: "exp-lookit-exit-survey.why-birthdate",
          inputType: "date",
          isRequired: true,
          maxValueExpression: "today()",
          name: names.birthDate,
          title: "exp-lookit-exit-survey.confirm-birthdate",
          type: "text",
        },
        {
          description: "exp-lookit-exit-survey.databrary-info",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.databraryShare,
          title: "exp-lookit-exit-survey.q-databrary",
          type: "boolean",
          valueFalse: "no",
          valueTrue: "yes",
        },
        {
          choices: [
            {
              text: "exp-lookit-exit-survey.private-option-part-1",
              value: "private",
            },
            {
              text: "exp-lookit-exit-survey.scientific-option",
              value: "scientific",
            },
            {
              text: "exp-lookit-exit-survey.publicity-option",
              value: "public",
            },
          ],
          description: "",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.useOfMedia,
          title: "exp-lookit-exit-survey.acceptable-use-header",
          type: "radiogroup",
        },
        {
          choices: [
            { text: "exp-lookit-exit-survey.withdrawal-details", value: true },
          ],
          defaultValue: [],
          isRequired: false,
          name: names.withdrawal,
          title: "exp-lookit-exit-survey.withdrawal-header",
          type: "checkbox",
        },
        {
          autoGrow: true,
          name: names.feedback,
          rows: 3,
          title: "exp-lookit-exit-survey.feedback-label",
          type: "comment",
        },
      ],
      name: "page1",
    },
  ],
  showQuestionNumbers: "off",
};

/**
 * Alter survey to only show "private" on use of media question.
 *
 * @param trial - Info parameters.
 */
const privateLevelOnly = (trial: TrialType<PluginInfo>) => {
  if (trial.private_level_only) {
    const media_use_element = survey.pages[0].elements.find(
      (element) => element.name === names.useOfMedia,
    );
    media_use_element &&
      Object.assign(media_use_element, {
        defaultValue: "private",
        description: "exp-lookit-exit-survey.private-option-part-1",
        choicesVisibleIf: "false", // this must be a string expression
        isRequired: false,
      });
  }
};

/**
 * Alter survey to show Databrary options.
 *
 * @param trial - Info parameters.
 */
const showDatabraryOptions = (trial: TrialType<PluginInfo>) => {
  if (!trial.show_databrary_options) {
    const survey_elements = survey.pages[0].elements;
    const databrary_share_element_idx = survey_elements.findIndex(
      (element) => element.name === names.databraryShare,
    );
    survey_elements.splice(databrary_share_element_idx, 1);
  }
};

/**
 * Alter survey to contain additional video privacy text.
 *
 * @param trial - Info parameters.
 */
const additionalVideoPrivacyText = (trial: TrialType<PluginInfo>) => {
  const element = survey.pages[0].elements.find(
    (element) => element.name === names.useOfMedia,
  );
  element &&
    Object.assign(element, {
      description: trial.additional_video_privacy_text,
    });
};

/**
 * Translate the survey text.
 *
 * @param trial - Info parameters.
 */
const translation = (trial: TrialType<PluginInfo>) => {
  const { contact_info, name } = window.chs.study.attributes;
  const view = {
    ...trial,
    include_example: trial.include_withdrawal_example,
    contact: contact_info,
    name,
  };

  survey.pages[0].elements.forEach((element) => {
    // Descriptions
    element.description &&
      Object.assign(element, {
        description: i18next.t(element.description, view),
      });

    // Titles
    Object.assign(element, { title: i18next.t(element.title, view) });

    // Choices
    element.choices &&
      element.choices.forEach((choice) => {
        Object.assign(choice, { text: i18next.t(choice.text, view) });
      });
  });
};

/**
 * Translate survey text to desired locale.
 *
 * @param trial - Trial data including user supplied parameters.
 * @returns Survey json
 */
export const exitSurvey = (trial: TrialType<PluginInfo>) => {
  setLocale(trial);
  showDatabraryOptions(trial);
  additionalVideoPrivacyText(trial);
  privateLevelOnly(trial);
  translation(trial);

  return survey;
};
