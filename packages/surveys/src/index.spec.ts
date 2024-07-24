import SurveyPlugin from "@jspsych/plugin-survey";
import { initJsPsych } from "jspsych";
import { Trial as ConsentTrial } from "./consent";
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
  Object.defineProperty(global, "document", {
    value: {
      addEventListener: jest.fn(),
      querySelector: jest.fn().mockReturnValue({ style: { display: "" } }),
    },
  });

  const jsPsych = initJsPsych();
  const consent = new Surveys.consent(jsPsych);
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

  const exit = new Surveys.exit(initJsPsych());
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
    survey_json: Surveys.exit.prototype["surveyParameters"](trialInfo),
  });
});

test("Exit Survey private level only", () => {
  const exit = new Surveys.exit(initJsPsych());
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = {
    survey_function: jest.fn(),
    survey_json: jest.fn(),
    private_level_only: true,
  } as unknown as ExitTrial;
  exit.trial(display_element, trialInfo);
});

test("Exit Survey include withdrawal example", () => {
  const exit = new Surveys.exit(initJsPsych());
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = {
    survey_function: jest.fn(),
    survey_json: jest.fn(),
    include_withdrawal_example: true,
  } as unknown as ExitTrial;
  exit.trial(display_element, trialInfo);
});
