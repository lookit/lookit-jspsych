import { ExitSurveyPlugin } from "./exitSurvey";

test("Does exit survey return chsData correctly?", () => {
  expect(ExitSurveyPlugin.chsData()).toMatchObject({ chs_type: "exit" });
});
