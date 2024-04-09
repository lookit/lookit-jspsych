import {
  retrieveChild,
  retrievePastSessions,
  retrieveResponse,
  retrieveStudy,
  updateResponse,
} from "./api";

jest.mock("./utils", () => ({
  ...jest.requireActual("./utils"),
  getUuids: jest.fn(),
  get: jest.fn().mockReturnValue("asdf"),
  patch: jest.fn().mockReturnValue("asdf"),
}));

test("", async () => {
  expect(await retrieveChild()).toBe("asdf");
});

test("", async () => {
  expect(await retrievePastSessions("some uuid")).toBe("asdf");
});

test("", async () => {
  expect(await retrieveStudy()).toBe("asdf");
});

test("", async () => {
  expect(await retrieveResponse("some uuid")).toBe("asdf");
});

test("", async () => {
  expect(await updateResponse("some uuid", {})).toBe("asdf");
});
