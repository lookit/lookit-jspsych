import { version } from "../package.json";
import { ConsentSurveyPlugin } from "./consentSurvey";

jest.mock("jspsych");

test("Does consent survey return chsData correctly?", () => {
  expect(ConsentSurveyPlugin.chsData()).toEqual({
    chs_type: "consent",
    chs_version: version,
  });
});
