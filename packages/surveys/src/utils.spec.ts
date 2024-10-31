import { Model } from "survey-jquery";
import { Trial } from "./exitSurvey";
import {
  consentSurveyFunction,
  exitSurveyFunction,
  textMarkdownSurveyFunction,
} from "./utils";

jest.mock("@lookit/data", () => ({
  ...jest.requireActual("@lookit/data"),
  updateResponse: jest.fn().mockReturnValue("Response"),
}));

/**
 * Helper function to generate a trial object.
 *
 * @param values - Additonal paramters added to trial object
 * @returns Trial object
 */
const getTrial = (values: Record<string, string | boolean> = {}) =>
  ({
    locale: "en-US",
    ...values,
  }) as unknown as Trial;

/**
 * Helper function to generate surveys for testing.
 *
 * @param values - Values to add to survey object
 * @returns Survey
 */
const getSurvey = (values: Record<string, string | object> = {}) =>
  ({
    onComplete: { add: jest.fn() },
    onTextMarkdown: { add: jest.fn() },
    ...values,
  }) as unknown as Model;

test("Markdown to HTML through survey function", () => {
  const addMock = jest.fn();
  const survey = getSurvey({ onTextMarkdown: { add: addMock } });
  const textValue = "some text";
  const options = { text: `**${textValue}**`, html: null };
  const rtnSurvey = textMarkdownSurveyFunction(survey);
  const anonFn = addMock.mock.calls[0][0];

  anonFn(null, options);

  expect(options.html).toEqual(`<strong>${textValue}</strong>`);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("Exit survey function", () => {
  const survey = getSurvey();
  const trial = getTrial();
  const rtnSurvey = exitSurveyFunction(trial)(survey);

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("Anonymous function within exit survey function where withdrawal > 0", () => {
  const addMock = jest.fn();
  const survey = getSurvey({ onComplete: { add: addMock } });
  const sender = { setValue: jest.fn() };
  const trial = getTrial();

  exitSurveyFunction(trial)(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 1 } }),
  });
  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", true]);
});

test("Anonymous function within exit survey function where withdrawal is 0", () => {
  const addMock = jest.fn();
  const survey = getSurvey({ onComplete: { add: addMock } });
  const sender = { setValue: jest.fn() };
  const trial = getTrial();

  exitSurveyFunction(trial)(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 0 } }),
  });

  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", false]);
});

test("Consent survey function", () => {
  const survey = getSurvey();
  const survey_function = consentSurveyFunction();
  const rtnSurvey = survey_function(survey);

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("User function for consent survey function", () => {
  const survey = getSurvey();
  const userFn = jest.fn();
  const survey_function = consentSurveyFunction(userFn);

  survey_function(survey);

  expect(userFn).toHaveBeenCalledTimes(1);
});

test("Anonymous function within consent survey function", () => {
  const addMock = jest.fn();
  const survey = getSurvey({ onComplete: { add: addMock } });

  consentSurveyFunction()(survey);

  const anonFn = addMock.mock.calls[0][0];

  Object.assign(window, { chs: { response: { id: "some id" } } });

  anonFn();

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
});

test("Set SurveyJS locale parameter", () => {
  const trial = getTrial();
  const survey = getSurvey();
  exitSurveyFunction(trial)(survey);
  expect(survey.locale).toStrictEqual("en-US");
});

test("Set SurveyJS locale parameter to French", () => {
  const trial = getTrial({ locale: "fr" });
  const survey = getSurvey();
  exitSurveyFunction(trial)(survey);
  expect(survey.locale).toStrictEqual(trial.locale);
});
