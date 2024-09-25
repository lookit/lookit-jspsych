import SurveyPlugin from "@jspsych/plugin-survey";
import { initJsPsych } from "jspsych";
import { Trial as ConsentTrial } from "./consentSurvey";
import { Trial as ExitTrial } from "./exit";
import Surveys from "./index";
import { consentSurveyFunction, exitSurveyFunction } from "./utils";

jest.mock("@jspsych/plugin-survey");
jest.mock("jspsych");
jest.mock("./utils");

afterEach(() => {
  jest.clearAllMocks();
});

test("Consent Survey", () => {
  const jsPsych = initJsPsych();
  const consent = new Surveys.ConsentSurveyPlugin(jsPsych);
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = { survey_function: jest.fn() } as unknown as ConsentTrial;

  consent.trial(display_element, trialInfo);

  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledWith(display_element, {
    ...trialInfo,
    survey_function: consentSurveyFunction(trialInfo.survey_function),
  });
  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
});

test("Exit Survey", () => {
  Object.defineProperty(global, "window", {
    value: {
      chs: { study: { attributes: { contact_info: jest.fn() } } },
    },
  });

  const exit = new Surveys.ExitSurveyPlugin(initJsPsych());
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = {
    survey_function: jest.fn(),
    survey_json: jest.fn(),
  } as unknown as ExitTrial;

  exit.trial(display_element, trialInfo);

  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledWith(display_element, {
    ...trialInfo,
    survey_function: exitSurveyFunction,
    survey_json:
      Surveys.ExitSurveyPlugin.prototype["surveyParameters"](trialInfo),
  });
});

// test("Exit Survey private level only", () => {
//   const exit = new Surveys.exit(initJsPsych());
//   const display_element = jest.fn() as unknown as HTMLElement;
//   const trialInfo = {
//     survey_function: jest.fn(),
//     survey_json: jest.fn(),
//     private_level_only: true,
//   } as unknown as ExitTrial;
//   expect(exit.trial(display_element, trialInfo)).toBeUndefined();
//   expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
// });

// test("Exit Survey include withdrawal example", () => {
//   const exit = new Surveys.exit(initJsPsych());
//   const display_element = jest.fn() as unknown as HTMLElement;
//   const trialInfo = {
//     survey_function: jest.fn(),
//     survey_json: jest.fn(),
//     include_withdrawal_example: true,
//   } as unknown as ExitTrial;
//   expect(exit.trial(display_element, trialInfo)).toBeUndefined();
//   expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
// });
