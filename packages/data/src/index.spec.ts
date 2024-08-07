import Api from "./index";
import { LookitWindow } from "./types";

declare const window: LookitWindow;

jest.mock("./utils", () => ({
  ...jest.requireActual("./utils"),
  getUuids: jest.fn(),
}));

jest.mock("./api", () => ({
  ...jest.requireActual("./api"),
  retrieveStudy: jest.fn().mockReturnValue("Study"),
  retrieveChild: jest.fn().mockReturnValue("Child"),
  retrievePastSessions: jest.fn().mockReturnValue("PastSessions"),
  retrieveResponse: jest.fn().mockReturnValue("Response"),
}));

test("Load data for this study into window.chs", async () => {
  expect(Object.hasOwn(window, "chs")).toBeFalsy();
  await Api.load("response uuid");
  expect(window.chs).toEqual({
    study: "Study",
    child: "Child",
    pastSessions: "PastSessions",
    response: "Response",
  });
});
