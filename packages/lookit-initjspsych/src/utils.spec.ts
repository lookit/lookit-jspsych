import { DataCollection } from "jspsych/dist/modules/data/DataCollection";

import { Child, PastSession, Study } from "@lookit/data/dist/types";
import { ResponseData } from "./types";
import { csrfToken, get, on_data_update, on_finish, patch } from "./utils";

delete global.window.location;
global.window = Object.create(window);
global.window.location = { replace: jest.fn() };

test("Find CSRF Token in cookies.", () => {
  expect(csrfToken()).toBe("");

  const token = "some-csrf-token";
  document.cookie = `csrftoken=${token};`;

  expect(csrfToken()).toBe(token);
});

test("Restful Get", async () => {
  const jsonData = { date: new Date() };
  const response = {
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await get("some-url")).toBe(jsonData);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(Request).toHaveBeenCalledTimes(1);
});

test("Restful Patch", async () => {
  const jsonData = { date: new Date() };
  const expData = {} as DataCollection;
  const data: ResponseData = {
    id: "uuid id",
    type: "responses",
    attributes: { exp_data: [expData], completed: false },
  };
  const response = {
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;

  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await patch("some-url", true, data)).toBe(jsonData);
  expect(await patch("some-url", false, data)).toBe(jsonData);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPysch's on_data_update", async () => {
  const jsonData = { data: { attributes: { exp_data: [] } } };
  const response = {
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;
  const data = {} as DataCollection;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await on_data_update("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPysch's on_data_update", async () => {
  const jsonData = { data: { attributes: { exp_data: undefined } } };
  const response = {
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;
  const data = {} as DataCollection;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await on_data_update("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_finish", async () => {
  const jsonData = {
    data: { attributes: { exp_data: {} } },
  };
  const data = { values: () => {} } as DataCollection;
  const response = {
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "asdf" } } as Study,
      child: {} as Child,
      pastSessions: {} as PastSession[],
    },
  });

  expect(await on_finish("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(Request).toHaveBeenCalledTimes(1);
});
