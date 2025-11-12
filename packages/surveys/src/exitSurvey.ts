import SurveyPlugin from "@jspsych/plugin-survey";
import chsTemplates from "@lookit/templates";
import { ParameterType, TrialType } from "jspsych";
import { exitSurveyFunction } from "./utils";

const info = <const>{
  ...SurveyPlugin.info,
  parameters: {
    ...SurveyPlugin.info.parameters,
    locale: {
      type: ParameterType.STRING,
      default: "en-us",
    },
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
  data: {
    ...SurveyPlugin.info.data,
    chs_type: {
      type: ParameterType.STRING,
    },
  },
};

type Info = typeof info;
export type Trial = TrialType<Info>;

/** Exit Survey Plugin extending jsPsych's Survey Plugin. */
export class ExitSurveyPlugin extends SurveyPlugin {
  public static readonly info = info;

  /**
   * Extended trial method supplied with parameters necessary for our Exit
   * Survey.
   *
   * @param display_element - Display element.
   * @param trial - Info parameters.
   */
  public trial(display_element: HTMLElement, trial: Trial) {
    super.trial(display_element, {
      ...trial,
      survey_json: chsTemplates.exitSurvey(trial),
      survey_function: exitSurveyFunction(trial),
    });
  }

  /**
   * Add CHS type to experiment data. This will enable Lookit API to run the
   * "exit" Frame Action Dispatcher method after the experiment has completed.
   * It looks like jsPsych uses snake case for these data.
   *
   * @returns Object containing CHS type.
   */
  public static chsData() {
    return { chs_type: "exit" };
  }
}
