import {
  finish,
  retrieveChild,
  retrievePastSessions,
  retrieveResponse,
  retrieveStudy,
  updateResponse,
} from "./api";

jest.mock("./utils", () => ({
  ...jest.requireActual("./utils"),
  getUuids: jest.fn(),
  get: jest.fn().mockReturnValue("get response"),
  patch: jest.fn().mockReturnValue("patch response"),
}));

test("Api call to get Child", async () => {
  expect(await retrieveChild()).toStrictEqual("get response");
});

test("Api call to get Past Sessions", async () => {
  expect(await retrievePastSessions("some uuid")).toStrictEqual("get response");
});

test("Api call to get Study", async () => {
  expect(await retrieveStudy()).toStrictEqual("get response");
});

test("Api call to get Response", async () => {
  expect(await retrieveResponse("some uuid")).toStrictEqual("get response");
});

test("Api call to patch Response", async () => {
  expect(await updateResponse("some uuid", {})).toStrictEqual("patch response");
});

test("Check that all calls to API have finished", async () => {
  expect(await finish()).toStrictEqual([
    "get response",
    "get response",
    "get response",
    "get response",
    "patch response",
  ]);
});
