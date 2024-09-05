import { initJsPsych } from "jspsych";
import { ExitSurveyPlugin, Trial as ExitTrial } from "./exit";
import { names, surveyJSON } from "./exit_json";

afterEach(() => {
  jest.clearAllMocks();
});

test("Is Exit Survey's survey parameters calling the correct functions", () => {
  const privateLevelOnly = jest.spyOn(
    ExitSurveyPlugin.prototype,
    "privateLevelOnly",
  );
  const showDatabraryOptions = jest.spyOn(
    ExitSurveyPlugin.prototype,
    "showDatabraryOptions",
  );
  const includeWithdrawalExample = jest.spyOn(
    ExitSurveyPlugin.prototype,
    "includeWithdrawalExample",
  );
  const additionalVideoPrivacyText = jest.spyOn(
    ExitSurveyPlugin.prototype,
    "additionalVideoPrivacyText",
  );
  const jsPsych = initJsPsych();
  const display_element = jest.fn() as unknown as HTMLElement;
  const trialInfo = {
    survey_function: jest.fn(),
    survey_json: jest.fn(),
    show_databrary_options: true,
  } as unknown as ExitTrial;
  const exit = new ExitSurveyPlugin(jsPsych);

  Object.defineProperty(global, "window", {
    value: {
      chs: { study: { attributes: { contact_info: jest.fn() } } },
    },
  });
  Object.defineProperty(global, "document", {
    value: {
      addEventListener: jest.fn(),
      querySelector: jest.fn().mockReturnValue({ style: { display: "" } }),
    },
  });

  exit.trial(display_element, trialInfo);

  expect(privateLevelOnly).toHaveBeenCalledTimes(1);
  expect(showDatabraryOptions).toHaveBeenCalledTimes(1);
  expect(includeWithdrawalExample).toHaveBeenCalledTimes(1);
  expect(additionalVideoPrivacyText).toHaveBeenCalledTimes(1);
});

test("Are the Databrary options removed?", () => {
  ExitSurveyPlugin.prototype["showDatabraryOptions"]({
    show_databrary_options: true,
  } as unknown as ExitTrial);
  expect(
    surveyJSON.pages[0].elements.find(
      (element) => element.name === names.databraryShare,
    ),
  ).toBeDefined();

  ExitSurveyPlugin.prototype["showDatabraryOptions"]({
    show_databrary_options: false,
  } as unknown as ExitTrial);

  expect(
    surveyJSON.pages[0].elements.find(
      (element) => element.name === names.databraryShare,
    ),
  ).toBeUndefined();
});

test("Is the private level only shown?", () => {
  const useOfMedia = surveyJSON.pages[0].elements.find(
    (el) => el.name === names.useOfMedia,
  );

  ExitSurveyPlugin.prototype["privateLevelOnly"]({
    private_level_only: false,
  } as unknown as ExitTrial);

  expect(useOfMedia?.description).toBeUndefined();
  expect(useOfMedia?.defaultValue).toBeUndefined();

  ExitSurveyPlugin.prototype["privateLevelOnly"]({
    private_level_only: true,
  } as unknown as ExitTrial);

  expect(useOfMedia?.description).toEqual(
    "Your video data is private and may only be viewed by authorized scientists.",
  );
  expect(useOfMedia?.defaultValue).toEqual("private");
});

test("Is additional privacy text shown?", () => {
  const useOfMedia = surveyJSON.pages[0].elements.find(
    (element) => element.name === names.useOfMedia,
  );
  const additionalText = "some additional text";
  expect(useOfMedia?.description).toEqual(
    "Your video data is private and may only be viewed by authorized scientists.",
  );
  ExitSurveyPlugin.prototype["additionalVideoPrivacyText"]({
    additional_video_privacy_text: additionalText,
  } as unknown as ExitTrial);
  expect(useOfMedia?.description).toEqual(additionalText);
});

test("Is the withdrawal example included?", () => {
  const withdrawal = surveyJSON.pages[0].elements.find(
    (element) => element.name === names.withdrawal,
  );

  ExitSurveyPlugin.prototype["includeWithdrawalExample"]({
    include_withdrawal_example: false,
  } as unknown as ExitTrial);

  expect(withdrawal?.choices[0].text).not.toContain("state secrets");

  ExitSurveyPlugin.prototype["includeWithdrawalExample"]({
    include_withdrawal_example: true,
  } as unknown as ExitTrial);

  expect(withdrawal?.choices[0].text).toContain("state secrets");
});
