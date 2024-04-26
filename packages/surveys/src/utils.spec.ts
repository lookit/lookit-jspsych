import { Model } from "survey-jquery";
import {
  consentSurveyFunction,
  exitSurveyFunction,
  textMarkdownSurveyFunction,
} from "./utils";

jest.mock("@lookit/data", () => ({
  ...jest.requireActual("@lookit/data"),
  updateResponse: jest.fn().mockReturnValue("Response"),
}));

test("", () => {
  const addMock = jest.fn();
  const survey = { onTextMarkdown: { add: addMock } } as unknown as Model;
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
  const survey = {
    onComplete: { add: jest.fn() },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const rtnSurvey = exitSurveyFunction(survey);

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("Anonymous function within exit survey function where withdrawal > 0", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const sender = { setValue: jest.fn() };

  exitSurveyFunction(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 1 } }),
  });
  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", true]);
});

test("Anonymous function within exit survey function where withdrawal is 0", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const sender = { setValue: jest.fn() };

  exitSurveyFunction(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 0 } }),
  });

  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", false]);
});

test("Consent survey function", () => {
  const survey = {
    onComplete: { add: jest.fn() },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const survey_function = consentSurveyFunction();
  const rtnSurvey = survey_function(survey);

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("User function for consent survey function", () => {
  const survey = {
    onComplete: { add: jest.fn() },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const userFn = jest.fn();
  const survey_function = consentSurveyFunction(userFn);

  survey_function(survey);

  expect(userFn).toHaveBeenCalledTimes(1);
});

test("Anonymous function within consent survey function", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;

  consentSurveyFunction()(survey);

  const anonFn = addMock.mock.calls[0][0];

  Object.assign(window, { chs: { response: { id: "some id" } } });

  anonFn();

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
});
