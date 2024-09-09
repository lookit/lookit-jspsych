import { ConsentSurveyPlugin } from "./consent";

test("Does consent survey return chsData correctly?", () => {
  expect(ConsentSurveyPlugin.chsData()).toMatchObject({ chs_type: "consent" });
});
