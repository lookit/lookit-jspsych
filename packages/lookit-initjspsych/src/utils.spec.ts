import { DataCollection, JsPsych } from "jspsych";

import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import { NoJsPsychInstanceError } from "./errors";
import { on_data_update, on_finish } from "./utils";

delete global.window.location;
global.window = Object.create(window);
global.window.location = { replace: jest.fn() };
// Even though we're not using Api.retrieveResponse in on_data_update/on_finish anymore, we still need to mock fetch because it is used to send the PATCH request.
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    /**
     * Mock json method and returned data object.
     *
     * @returns Promise that resolves with a data attribute.
     */
    json: () => Promise.resolve({ data: {} }),
  } as Response),
);

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

  // on_data_update receives the latest data addition as its argument
  const data = { trial_index: 1, trial_type: "survey" } as JsPsychExpData;

  const userFn = jest.fn();
  global.Request = jest.fn();

  expect(
    await on_data_update(jsPsychMock as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
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

  const data = {} as JsPsychExpData;

  const userFn = jest.fn();
  global.Request = jest.fn();

  expect(
    await on_data_update(jsPsychMock as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(Request).toHaveBeenCalledTimes(1);
});

test("Error throws if jsPsych instance is null", () => {
  const jsPsychInstance: JsPsych | null = null;

  const data = {} as JsPsychExpData;

  const userFn = jest.fn();
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

  const data = {} as JsPsychExpData;

  const userFn = jest.fn();
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
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as DataCollection;

  const userFn = jest.fn();
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
  expect(Request).toHaveBeenCalledTimes(1);
});
