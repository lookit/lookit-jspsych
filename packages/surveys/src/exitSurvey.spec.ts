import { version } from "../package.json";
import { ExitSurveyPlugin } from "./exitSurvey";

test("Does exit survey return chsData correctly?", () => {
  expect(ExitSurveyPlugin.chsData()).toEqual({
    chs_type: "exit",
    chs_version: version,
  });
});
