import DOMPurify from "dompurify";
import { TrialType } from "jspsych";
import { marked } from "marked";
import * as SurveyJS from "survey-jquery";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey";
import survey from "./survey.json";

// Alter jsPsych's survey parameter typings
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type SurveyPluginInfo = typeof SurveyPlugin.info;
interface Info extends SurveyPluginInfo {
  parameters: Writeable<typeof SurveyPlugin.info.parameters>;
}

// Marked's options.
marked.use({
  async: false,
});

function lookit_survey_function(survey: SurveyJS.Model) {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set te type as "string" because async is false above.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text) as string,
    );
  });
  return survey;
}

class ExitSurveyPlugin extends SurveyPlugin {
  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    return super.trial(display_element, {
      ...trial,
      survey_json: survey as unknown as string,
      survey_function: lookit_survey_function,
    });
  }
}

export default ExitSurveyPlugin;
