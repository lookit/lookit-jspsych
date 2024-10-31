import SurveyPlugin from "@jspsych/plugin-survey";
import { LookitWindow } from "@lookit/data/dist/types";
import { initJsPsych } from "jspsych";
import { Trial as ConsentTrial } from "./consentSurvey";
import { Trial as ExitTrial } from "./exitSurvey";
import Surveys from "./index";
import { consentSurveyFunction } from "./utils";

declare const window: LookitWindow;

jest.mock("@jspsych/plugin-survey");
jest.mock("jspsych");
jest.mock("./utils");

afterEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global, "window", {
    value: {
      chs: {},
    },
  });
});

/**
 * Helper function to generate a trial object.
 *
 * @param values - Additonal paramters added to trial object
 * @returns Trial object
 */
const getTrial = (values: Record<string, string | boolean> = {}) =>
  ({
    locale: "en-US",
    survey_function: jest.fn(),
    survey_json: jest.fn(),
    ...values,
  }) as unknown as ExitTrial;

/**
 * Update chsData object for testing.
 *
 * @param values - Data added to global data object
 */
const chsData = (values: typeof window.chs) => {
  Object.defineProperty(global, "window", {
    value: {
      chs: values,
    },
  });
};

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

test("Exit Survey private level only", () => {
  const exit = new Surveys.ExitSurveyPlugin(initJsPsych());
  const display_element = jest.fn() as unknown as HTMLElement;
  chsData({
    study: { attributes: { contact_info: "contact info", name: "name" } },
  } as typeof window.chs);

  const trialInfo = getTrial({ private_level_only: true });
  expect(exit.trial(display_element, trialInfo)).toBeUndefined();
  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
});

test("Exit Survey include withdrawal example", () => {
  const exit = new Surveys.ExitSurveyPlugin(initJsPsych());
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = getTrial({ include_withdrawal_example: true });
  chsData({
    study: { attributes: { contact_info: "contact info", name: "name" } },
  } as typeof window.chs);

  expect(exit.trial(display_element, trialInfo)).toBeUndefined();
  expect(SurveyPlugin.prototype.trial).toHaveBeenCalledTimes(1);
});
