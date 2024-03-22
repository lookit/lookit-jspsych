import { TrialType } from "jspsych";
import SurveyPlugin from "../../../../jsPsych/packages/plugin-survey";
import surveyJSON from "./survey.json";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type SurveyPluginInfo = typeof SurveyPlugin.info;
interface Info extends SurveyPluginInfo {
  parameters: Writeable<typeof SurveyPlugin.info.parameters>;
}

class ExitSurvey extends SurveyPlugin {
  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    trial.survey_json = JSON.stringify(surveyJSON);
    return super.trial(display_element, trial);
  }
}

export default ExitSurvey;
