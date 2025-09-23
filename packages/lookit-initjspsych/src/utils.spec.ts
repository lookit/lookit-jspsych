import { DataCollection, JsPsych } from "jspsych";

import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import { NoJsPsychInstanceError, SequenceExpDataError } from "./errors";
import { on_data_update, on_finish } from "./utils";

delete global.window.location;
global.window = Object.create(window);
global.window.location = { replace: jest.fn() };

test("jsPsych's on_data_update with some exp_data", async () => {
  // mock jsPsych data
  const mockTrialData = [
    { trial_index: 0, trial_type: "test" },
    { trial_index: 1, trial_type: "survey" },
  ];
  const jsPsychMock = {
    data: {
      /**
       * Mocked jsPsych.data.get() function used in on_data_update
       *
       * @returns JsPsych data collection
       */
      get: () => ({
        /**
         * Mocked jsPsych.data.get().values() function used in on_data_update
         *
         * @returns Values from jsPsych data collection
         */
        values: () => mockTrialData,
      }),
    },
  };
  expect(jsPsychMock.data.get().values()).toEqual(mockTrialData);

  // mock lookit API data
  const jsonData = {
    data: {
      attributes: { sequence: ["0-first-trial"] },
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

  expect(
    await on_data_update(jsPsychMock as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_data_update with no exp_data", async () => {
  // mock jsPsych data
  const mockTrialData = [] as JsPsychExpData[];
  const jsPsychMock = {
    data: {
      /**
       * Mocked jsPsych.data.get() function used in on_data_update
       *
       * @returns JsPsych data collection
       */
      get: () => ({
        /**
         * Mocked jsPsych.data.get().values() function used in on_data_update
         *
         * @returns Values from jsPsych data collection
         */
        values: () => mockTrialData,
      }),
    },
  };
  expect(jsPsychMock.data.get().values()).toEqual(mockTrialData);

  // mock lookit API data
  const jsonData = {
    data: { attributes: { sequence: undefined } },
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

  expect(
    await on_data_update(jsPsychMock as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(Request).toHaveBeenCalledTimes(2);
});

test("Error throws if jsPsych instance is null", () => {
  const jsPsychInstance: JsPsych | null = null;

  // mock lookit API data
  const jsonData = {
    data: { attributes: { sequence: undefined } },
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

  expect(async () => {
    await on_data_update(
      jsPsychInstance as unknown as JsPsych,
      "some id",
      userFn,
    )(data);
  }).rejects.toThrow(NoJsPsychInstanceError);
});

test("Error throws if jsPsych instance is undefined", () => {
  const jsPsychInstance: JsPsych | undefined = undefined;

  // mock lookit API data
  const jsonData = {
    data: { attributes: { sequence: undefined } },
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

  expect(async () => {
    await on_data_update(
      jsPsychInstance as unknown as JsPsych,
      "some id",
      userFn,
    )(data);
  }).rejects.toThrow(NoJsPsychInstanceError);
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
  expect(userFn).toHaveBeenCalledWith(data);
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
