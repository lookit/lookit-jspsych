import { Model } from "survey-jquery";
import { exit_survey_function, survey_function } from "./utils";

test("", () => {
  const addMock = jest.fn();
  const survey = { onTextMarkdown: { add: addMock } } as unknown as Model;
  const textValue = "some text";
  const options = { text: `**${textValue}**`, html: null };
  const rtnSurvey = survey_function(survey);
  const anonFn = addMock.mock.calls[0][0];

  anonFn(null, options);

  expect(options.html).toEqual(`<strong>${textValue}</strong>`);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const rtnSurvey = exit_survey_function(survey);

  expect(survey.onComplete.add).toHaveBeenCalledTimes(1);
  expect(survey.onTextMarkdown.add).toHaveBeenCalledTimes(1);
  expect(survey).toBe(rtnSurvey);
});

test("", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const sender = { setValue: jest.fn() };

  exit_survey_function(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 1 } }),
  });
  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", true]);
});

test("", () => {
  const addMock = jest.fn();
  const survey = {
    onComplete: { add: addMock },
    onTextMarkdown: { add: jest.fn() },
  } as unknown as Model;
  const sender = { setValue: jest.fn() };

  exit_survey_function(survey);

  const anonFn = addMock.mock.calls[0][0];

  anonFn({
    ...sender,
    getQuestionByName: jest.fn().mockReturnValue({ value: { length: 0 } }),
  });

  expect(sender.setValue.mock.calls[0]).toEqual(["withdrawal", false]);
});
