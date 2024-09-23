import { ConsentSurveyPlugin } from "./consentSurvey";

test("Does consent survey return chsData correctly?", () => {
  expect(ConsentSurveyPlugin.chsData()).toMatchObject({ chs_type: "consent" });
});
