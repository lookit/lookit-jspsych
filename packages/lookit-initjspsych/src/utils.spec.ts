import Api from "@lookit/data";
import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { DataCollection, JsPsych } from "jspsych";
import { NoJsPsychInstanceError } from "./errors";
import { on_data_update, on_finish } from "./utils";

delete global.window.location;
global.window = Object.create(window);
global.window.location = { replace: jest.fn(), origin: "http://localhost" };
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

let consoleLogSpy: jest.SpyInstance<
  void,
  [message?: unknown, ...optionalParams: unknown[]],
  unknown
>;
let consoleWarnSpy: jest.SpyInstance<
  void,
  [message?: unknown, ...optionalParams: unknown[]],
  unknown
>;
let consoleErrorSpy: jest.SpyInstance<
  void,
  [message?: unknown, ...optionalParams: unknown[]],
  unknown
>;

beforeEach(() => {
  jest.useRealTimers();
  // Hide the console output during tests. Tests can still assert on these spies to check console calls.
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();

  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

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

test("on_data_update throws error if jsPsych instance is null", () => {
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

test("on_data_update throws error if jsPsych instance is undefined", () => {
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
  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toBe("");

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
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  expect(
    await on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(jsPsychMock.getDisplayElement).toHaveBeenCalledTimes(2); // once to check initial state, once to modify
  expect(displayElement.innerHTML).toContain(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
});

test("jsPsych's on_finish with successful pending uploads", async () => {
  const successfulUpload = Promise.resolve("url");

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [{ filename: "video1", promise: successfulUpload }],
    },
  });

  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toBe("");

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

  await expect(
    on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).resolves.toBeUndefined();
  expect(jsPsychMock.getDisplayElement).toHaveBeenCalledTimes(2); // once to check initial state, once to modify
  expect(displayElement.innerHTML).toContain(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=child-id&response=response-uuid",
  );
});

test("jsPsych's on_finish with a rejected pending upload", async () => {
  const rejectedUpload = Promise.reject(new Error("Upload failed"));

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [{ filename: "video1", promise: rejectedUpload }],
    },
  });

  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toContain("");

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

  // Upload promise rejections should not cause the on_finish function to throw
  await expect(
    on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).resolves.toBeUndefined();
  expect(jsPsychMock.getDisplayElement).toHaveBeenCalledTimes(2); // once to check initial state, once to modify
  expect(displayElement.innerHTML).toContain(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=child-id&response=response-uuid",
  );
});

test("jsPsych's on_finish catches and logs errors while awaiting pending uploads", async () => {
  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toBe("");

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

  // Mock an error that originates from API requests
  const error = new Error("API failed");
  jest.spyOn(Api, "updateResponse").mockRejectedValue(error);
  jest.spyOn(Api, "finish").mockResolvedValue([]);

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  const fn = on_finish(
    jsPsychMock as unknown as JsPsych,
    "response-uuid",
    userFn,
  );

  // Should not throw — error is caught internally
  await fn(data);

  expect(displayElement.innerHTML).toBe(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error while finishing the experiment and saving data/video: ",
    error,
  );
});

test("jsPsych's on_finish with no recording or pending uploads", async () => {
  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toBe("");

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
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  expect(
    await on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).toBeUndefined();
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
});

test("on_finish shows loading animation before uploads complete", async () => {
  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data = [{ key: "value" }];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as DataCollection;

  // pending upload that never settles
  let uploadResolve!: () => void;
  const pendingUpload = new Promise<void>((resolve) => {
    uploadResolve = resolve;
  });

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [{ promise: pendingUpload, filename: "video.webm" }],
    },
  });

  const fn = on_finish(jsPsychMock as unknown as JsPsych, "response-uuid");

  // Call on_finish but DO NOT await it so that we can inspect state before resolution
  const finishPromise = fn(data);

  expect(jsPsychMock.getDisplayElement).toHaveBeenCalled();
  expect(displayElement.innerHTML).toBe(chsTemplates.loadingAnimation());

  // Now allow uploads to complete so test can finish
  uploadResolve();
  await finishPromise;
});

test("jsPsych's on_finish with no pendingUploads property on window.chs", async () => {
  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
    },
  });

  // mock jsPsych getDisplayElement
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };
  expect(jsPsychMock.getDisplayElement().innerHTML).toBe("");

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

  await expect(
    on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).resolves.toBeUndefined();
  expect(jsPsychMock.getDisplayElement).toHaveBeenCalledTimes(2); // once to check initial state, once to modify
  expect(displayElement.innerHTML).toContain(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);
  expect(Request).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=child-id&response=response-uuid",
  );
});

test("on_finish appends child and response IDs to exit_url that already has query params", async () => {
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data = [{ key: "value" }];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: {
        attributes: { exit_url: "https://example.com/exit?existing=param" },
      } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?existing=param&child=child-id&response=response-uuid",
  );
});

test("on_finish falls back to window.location.origin if the URL is invalid", async () => {
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data = [{ key: "value" }];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "not a valid url" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "http://localhost/?child=child-id&response=response-uuid",
  );
});

test("on_finish handles exit URLs without the https prefix", async () => {
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    /**
     * Mock for getDisplayElement
     *
     * @returns Object with an innerHTML property
     */
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data = [{ key: "value" }];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "done.com" } } as Study,
      child: { id: "child-id" } as Child,
      response: { id: "response-uuid" },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://done.com/?child=child-id&response=response-uuid",
  );
});

test("on_finish throws error if jsPsych instance is null", () => {
  const jsPsychInstance: JsPsych | null = null;

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

  expect(async () => {
    await on_finish(
      jsPsychInstance as unknown as JsPsych,
      "some id",
      userFn,
    )(data);
  }).rejects.toThrow(NoJsPsychInstanceError);
});

test("on_finish throws error if jsPsych instance is undefined", () => {
  const jsPsychInstance: JsPsych | undefined = undefined;

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

  expect(async () => {
    await on_finish(
      jsPsychInstance as unknown as JsPsych,
      "some id",
      userFn,
    )(data);
  }).rejects.toThrow(NoJsPsychInstanceError);
});
