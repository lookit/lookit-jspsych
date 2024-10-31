import { LookitWindow } from "@lookit/data/dist/types";
import i18next from "i18next";
import { PluginInfo, TrialType } from "jspsych";
import { setLocale } from "./utils";

declare const window: LookitWindow;

/**
 * Class to augment and translate the exit survey JSON based on user set
 * parameters.
 */
class ExitSurveyJson {
  private names = <const>{
    birthDate: "birthDate",
    databraryShare: "databraryShare",
    useOfMedia: "useOfMedia",
    withdrawal: "withdrawal",
    feedback: "feedback",
  };
  public survey = {
    pages: [
      {
        elements: [
          {
            description: "exp-lookit-exit-survey.why-birthdate",
            inputType: "date",
            isRequired: true,
            maxValueExpression: "today()",
            name: this.names.birthDate,
            title: "exp-lookit-exit-survey.confirm-birthdate",
            type: "text",
          },
          {
            description: "exp-lookit-exit-survey.databrary-info",
            enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
            isRequired: true,
            name: this.names.databraryShare,
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
            name: this.names.useOfMedia,
            title: "exp-lookit-exit-survey.acceptable-use-header",
            type: "radiogroup",
          },
          {
            choices: [
              {
                text: "exp-lookit-exit-survey.withdrawal-details",
                value: true,
              },
            ],
            defaultValue: [],
            isRequired: false,
            name: this.names.withdrawal,
            title: "exp-lookit-exit-survey.withdrawal-header",
            type: "checkbox",
          },
          {
            autoGrow: true,
            name: this.names.feedback,
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
   * Adjust survey json to meet user's parameters.
   *
   * @param trial - Trial data including user supplied parameters.
   */
  public constructor(private trial: TrialType<PluginInfo>) {
    this.showDatabraryOptions();
    this.additionalVideoPrivacyText();
    this.privateLevelOnly();
    this.translation();
  }

  /** Alter survey to show Databrary options. */
  private showDatabraryOptions() {
    if (!this.trial.show_databrary_options) {
      const survey_elements = this.survey.pages[0].elements;
      const databrary_share_element_idx = survey_elements.findIndex(
        (element) => element.name === this.names.databraryShare,
      );
      survey_elements.splice(databrary_share_element_idx, 1);
    }
  }

  /** Alter survey to contain additional video privacy text. */
  private additionalVideoPrivacyText() {
    const element = this.survey.pages[0].elements.find(
      (element) => element.name === this.names.useOfMedia,
    );
    element &&
      Object.assign(element, {
        description: this.trial.additional_video_privacy_text,
      });
  }

  /** Alter survey to only show "private" on use of media question. */
  private privateLevelOnly() {
    if (this.trial.private_level_only) {
      const media_use_element = this.survey.pages[0].elements.find(
        (element) => element.name === this.names.useOfMedia,
      );
      media_use_element &&
        Object.assign(media_use_element, {
          defaultValue: "private",
          description: "exp-lookit-exit-survey.private-option-part-1",
          choicesVisibleIf: "false", // this must be a string expression
          isRequired: false,
        });
    }
  }

  /** Translate the survey text. */
  private translation() {
    const { contact_info, name } = window.chs.study.attributes;
    const view = {
      ...this.trial,
      include_example: this.trial.include_withdrawal_example,
      contact: contact_info,
      name,
    };

    this.survey.pages[0].elements.forEach((element) => {
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
  }
}

/**
 * Translate survey text to desired locale.
 *
 * @param trial - Trial data including user supplied parameters.
 * @returns Survey json
 */
export const exitSurvey = (trial: TrialType<PluginInfo>) => {
  setLocale(trial);
  return new ExitSurveyJson(trial).survey;
};
