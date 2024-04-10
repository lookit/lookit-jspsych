import { enableFetchMocks } from "jest-fetch-mock";
import { ApiResponse, Child } from "./types";
import { get, getUuids, patch } from "./utils";

enableFetchMocks();

function setLocationHref(href: string) {
  delete global.window.location;
  global.window = Object.create(window);
  global.window.location = { href };
}

test("", async () => {
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };
  fetchMock.mockOnce(JSON.stringify(data));
  expect(await get("some url")).toEqual(child);
});

test("", async () => {
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };
  fetchMock.mockOnce(JSON.stringify(data));
  expect(await patch("some url", {}, new AbortController())).toEqual(child);
});

test("", async () => {
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };
  fetchMock.mockOnce(JSON.stringify(data));
  expect(await patch("some url", {})).toEqual(child);
});

test("", () => {
  const data = {
    study: "1647e101-282a-4fde-a32b-4f493d14f57e",
    child: "8a2b2f04-63eb-485a-8e55-7b9362368f19",
  };
  setLocationHref(
    `https://localhost:8000/exp/studies/j/${data.study}/${data.child}/preview/`,
  );
  expect(getUuids()).toEqual(data);
});

test("", () => {
  const data = {
    study: "1647e101-282a-4fde-a32b-4f493d14f57e",
    child: "8a2b2f04-63eb-485a-8e55-7b9362368f19",
  };
  setLocationHref(
    `https://localhost:8000/exp/studies/j/${data.study}/${data.child}/`,
  );
  expect(getUuids()).toEqual(data);
});

test("", () => {
  setLocationHref("https://mit.edu");
  expect(() => {
    getUuids();
  }).toThrow("URL is different than expected.");
});
