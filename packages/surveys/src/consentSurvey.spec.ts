import { ConsentSurveyPlugin } from "./consentSurvey";

jest.mock("jspsych");

test("Does consent survey return chsData correctly?", () => {
  expect(ConsentSurveyPlugin.chsData()).toMatchObject({ chs_type: "consent" });
});
