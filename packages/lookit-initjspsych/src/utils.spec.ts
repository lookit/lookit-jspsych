import { DataCollection } from "jspsych";

import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import { SequenceExpDataError } from "./errors";
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
  const data = {} as JsPsychExpData;

  const userFn = jest.fn();
  global.fetch = jest.fn(() => Promise.resolve(response));
  global.Request = jest.fn();

  expect(await on_data_update("some id", userFn)(data)).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_finish", async () => {
  const exp_data = [{ key: "value" }];
  const jsonData = {
    data: {
      attributes: { exp_data, sequence: ["0-value"] },
    },
  };
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
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
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("Is an error thrown when experiment sequence is undefined?", () => {
  const exp_data = [{ key: "value" }];
  const jsonData = {
    data: {
      attributes: { exp_data, sequence: undefined },
    },
  };
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
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

  expect(async () => {
    await on_finish("some id", userFn)(data);
  }).rejects.toThrow(SequenceExpDataError);
});
