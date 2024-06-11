import { enableFetchMocks } from "jest-fetch-mock";
import { ApiResponse, Child } from "./types";
import { get, getUuids, patch } from "./utils";

enableFetchMocks();

/**
 * Helper function for this set of tests. This will update the current URL to
 * the value provided in argument href.
 *
 * @param href - URL to be set.
 * @returns Supplied URL.
 */
const setLocationHref = (href: string) => {
  /**
   * Helper function for this set of tests. This will update the current URL to
   * the value provided in argument href.
   */
  delete global.window.location;
  global.window = Object.create(window);
  global.window.location = { href };
  return href;
};

test("Api get function", async () => {
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };
  fetchMock.mockOnce(JSON.stringify(data));
  expect(await get("some url")).toEqual(child);
});

test("Api patch function", async () => {
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };
  fetchMock.mockOnce(JSON.stringify(data));
  expect(await patch("some url", {})).toEqual(child);
});

test("Get UUIDs from URL when study is preview", () => {
  const data = {
    study: "1647e101-282a-4fde-a32b-4f493d14f57e",
    child: "8a2b2f04-63eb-485a-8e55-7b9362368f19",
  };
  setLocationHref(
    `https://localhost:8000/exp/studies/j/${data.study}/${data.child}/preview/`,
  );
  expect(getUuids()).toEqual(data);
});

test("Get UUIDs from URL", () => {
  const data = {
    study: "1647e101-282a-4fde-a32b-4f493d14f57e",
    child: "8a2b2f04-63eb-485a-8e55-7b9362368f19",
  };
  setLocationHref(
    `https://localhost:8000/studies/j/${data.study}/${data.child}/`,
  );
  expect(getUuids()).toEqual(data);
});

test("Get UUIDs Error", () => {
  setLocationHref("https://mit.edu");
  expect(() => {
    getUuids();
  }).toThrow("URL is different than expected.");
});
