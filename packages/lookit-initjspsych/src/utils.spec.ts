import { DataCollection } from "jspsych";

import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import { on_data_update, on_finish } from "./utils";

delete global.window.location;
global.window = Object.create(window);
global.window.location = { replace: jest.fn() };

test("jsPsych's on_data_update with some exp_data", async () => {
  const jsonData = {
    data: {
      attributes: { exp_data: ["some data"], sequence: ["0-first-trial"] },
    },
  };
  const response = {
    /**
     * Mocked json function used in API calls.
     *
     * @returns Promise containing mocked json data.
     */
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;
  const data = {} as JsPsychExpData;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await on_data_update("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_data_update with no exp_data", async () => {
  const jsonData = {
    data: { attributes: { exp_data: undefined, sequence: undefined } },
  };
  const response = {
    /**
     * Mocked json function used in API calls.
     *
     * @returns Promise containing mocked json data.
     */
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
  const data = {
    /** Mocked jsPsych Data Collection. */
    values: () => {},
  } as DataCollection;
  const response = {
    /**
     * Mocked json function used in API calls.
     *
     * @returns Promise containing mocked json data.
     */
    json: () => Promise.resolve(jsonData),
    ok: true,
  } as Response;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "exit url" } } as Study,
      child: {} as Child,
      pastSessions: {} as Response[],
    },
  });

  expect(await on_finish("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(Request).toHaveBeenCalledTimes(1);
});
