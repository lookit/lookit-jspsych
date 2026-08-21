import Api from "@lookit/data";
import {
  Child,
  JsPsychExpData,
  Response as ApiResponseData,
  Study,
} from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { DataCollection, JsPsych } from "jspsych";
import { NoJsPsychInstanceError } from "./errors";
import {
  add_session_recording_data,
  get_session_recording_data,
  on_data_update,
  on_finish,
} from "./utils";

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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [{ file: "video1", promise: successfulUpload }],
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
  expect(Request).toHaveBeenCalledTimes(1); // single request: no retries were needed
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=hash-child-id&response=response-uuid",
  );
  // Nothing failed, so nothing should have been logged.
  expect(consoleErrorSpy).not.toHaveBeenCalled();
});

test("jsPsych's on_finish with a rejected pending upload", async () => {
  const rejectedUpload = Promise.reject(new Error("Upload failed"));

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [{ file: "video1", promise: rejectedUpload }],
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
  // Response data update still succeeds on its own (single request, no retries
  // needed) — a failed upload doesn't affect it.
  expect(Request).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=hash-child-id&response=response-uuid",
  );
  // The failed upload is logged (once, with no retry) rather than silently dropped.
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Pending upload failed for "video1": ',
    new Error("Upload failed"),
  );
});

test("jsPsych's on_finish with all pending uploads rejected", async () => {
  const rejectedUpload1 = Promise.reject(new Error("Upload failed: video1"));
  const rejectedUpload2 = Promise.reject(new Error("Upload failed: video2"));

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [
        { file: "video1", promise: rejectedUpload1 },
        { file: "video2", promise: rejectedUpload2 },
      ],
    },
  });

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

  const userFn = jest.fn();

  // All uploads failing still shouldn't cause on_finish to throw, or block
  // the response data update / redirect.
  await expect(
    on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).resolves.toBeUndefined();

  // Response data update still succeeds independently (single request).
  expect(Request).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=hash-child-id&response=response-uuid",
  );

  // Every failed upload is logged individually — none are retried.
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Pending upload failed for "video1": ',
    new Error("Upload failed: video1"),
  );
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    'Pending upload failed for "video2": ',
    new Error("Upload failed: video2"),
  );
});

test("jsPsych's on_finish records upload outcomes in the trial data and writes them", async () => {
  const successfulUpload = Promise.resolve();
  const failedUpload = Promise.reject(new Error("upload boom"));

  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data: JsPsychExpData[] = [
    {
      trial_index: 0,
      trial_type: "start-record-plugin",
      chs_recording: {
        filename: "vid-A.webm",
        is_session_recording: true,
        stream_time: { trial_start_ms: 0 },
      },
    },
    {
      trial_index: 1,
      trial_type: "html-keyboard-response",
      chs_recording: {
        filename: "vid-B.webm",
        is_session_recording: false,
        stream_time: null,
      },
    },
  ];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as unknown as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [
        { file: "vid-A.webm", promise: successfulUpload, status: "success" },
        {
          file: "vid-B.webm",
          promise: failedUpload,
          status: "failure",
          error_message: "upload boom",
        },
      ],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "response-uuid")(data);

  // Upload outcomes are written into the matching trials' recording data.
  expect(exp_data[0].chs_recording?.upload_status).toBe("success");
  expect(exp_data[0].chs_recording?.upload_error).toBeUndefined();
  expect(exp_data[1].chs_recording?.upload_status).toBe("failure");
  expect(exp_data[1].chs_recording?.upload_error).toBe("upload boom");

  // Two writes: the initial data save, then a second write with the upload
  // outcomes (which weren't known at the first save).
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_finish records one recording's outcome on every trial sharing its filename (session recording)", async () => {
  const successfulUpload = Promise.resolve();

  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    getDisplayElement: jest.fn(() => displayElement),
  };

  // A single session recording spans multiple trials, so several trials share
  // the same filename and all should be annotated from the one upload.
  const exp_data: JsPsychExpData[] = [
    {
      trial_index: 0,
      trial_type: "start-record-plugin",
      chs_recording: {
        filename: "session.webm",
        is_session_recording: true,
        stream_time: { trial_start_ms: 0 },
      },
    },
    {
      trial_index: 1,
      trial_type: "html-keyboard-response",
      chs_recording: {
        filename: "session.webm",
        is_session_recording: true,
        stream_time: { trial_start_ms: 1200 },
      },
    },
    {
      trial_index: 2,
      trial_type: "survey-html-form",
      chs_recording: {
        filename: "session.webm",
        is_session_recording: true,
        stream_time: { trial_start_ms: 3400 },
      },
    },
  ];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as unknown as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [
        { file: "session.webm", promise: successfulUpload, status: "success" },
      ],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "response-uuid")(data);

  // Every trial belonging to the session recording is annotated from the one
  // upload record.
  exp_data.forEach((trial) => {
    expect(trial.chs_recording?.upload_status).toBe("success");
    expect(trial.chs_recording?.upload_error).toBeUndefined();
  });

  // Still two writes: the initial data save, then a single second write
  // covering all the annotated trials.
  expect(Request).toHaveBeenCalledTimes(2);
});

test("jsPsych's on_finish warns and does not write a second time for an upload with no matching trial", async () => {
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    getDisplayElement: jest.fn(() => displayElement),
  };

  // Trial data has no recording, so the upload's filename won't match.
  const exp_data: JsPsychExpData[] = [
    { trial_index: 0, trial_type: "html-keyboard-response" },
  ];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as unknown as DataCollection;

  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [
        { file: "orphan.webm", promise: Promise.resolve(), status: "success" },
      ],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "response-uuid")(data);

  expect(consoleWarnSpy).toHaveBeenCalledWith(
    'No trial data found for uploaded recording "orphan.webm"; its upload status was not recorded in the data.',
  );
  // No trial was annotated, so only the initial data save happens.
  expect(Request).toHaveBeenCalledTimes(1);
});

test("jsPsych's on_finish retries the response update, then catches and logs errors after retries are exhausted", async () => {
  jest.useFakeTimers();

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
  const updateResponseSpy = jest
    .spyOn(Api, "updateResponse")
    .mockRejectedValue(error);
  jest.spyOn(Api, "finish").mockResolvedValue([]);

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  const setTimeoutSpy = jest.spyOn(global, "setTimeout");

  const fn = on_finish(
    jsPsychMock as unknown as JsPsych,
    "response-uuid",
    userFn,
  );

  // Should not throw — error is caught internally after retries are exhausted
  const finishPromise = fn(data);
  await jest.runAllTimersAsync();
  await finishPromise;

  expect(displayElement.innerHTML).toBe(chsTemplates.loadingAnimation());
  expect(userFn).toHaveBeenCalledTimes(1);
  expect(userFn).toHaveBeenCalledWith(data);

  // Initial attempt + 3 retries = 4 total calls
  expect(updateResponseSpy).toHaveBeenCalledTimes(4);

  // Backoff waits of 1s, 2s, then 4s between attempts — ~7s total before
  // giving up. This is the ceiling on how long the participant waits here.
  const backoffDelays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);
  expect(backoffDelays).toEqual([1000, 2000, 4000]);

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error while saving final response data after retries: ",
    error,
  );

  // Redirect still happens even though the response update ultimately failed,
  // so the participant isn't stuck indefinitely. But because updateResponse
  // never succeeded, the final exp_data and completed:true were never
  // persisted — the response stays at whatever state the last successful
  // on_data_update call left it in.
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});

test("jsPsych's on_finish retries the response update twice, then succeeds", async () => {
  jest.useFakeTimers();

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

  const userFn = jest.fn();

  const error = new Error("Transient API failure");
  const updateResponseSpy = jest
    .spyOn(Api, "updateResponse")
    .mockRejectedValueOnce(error)
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce({} as ApiResponseData);
  jest.spyOn(Api, "finish").mockResolvedValue([]);

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  const setTimeoutSpy = jest.spyOn(global, "setTimeout");

  const fn = on_finish(
    jsPsychMock as unknown as JsPsych,
    "response-uuid",
    userFn,
  );

  const finishPromise = fn(data);
  await jest.runAllTimersAsync();
  await finishPromise;

  // 2 failures + 1 success = 3 total calls; the 3rd one persisted the data,
  // so nothing is lost.
  expect(updateResponseSpy).toHaveBeenCalledTimes(3);

  // Only two backoff waits (before attempt 2 and attempt 3) — ~3s total
  // before the participant sees the redirect.
  const backoffDelays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);
  expect(backoffDelays).toEqual([1000, 2000]);

  // Eventual success means nothing gets logged as an error — the retries
  // were invisible to anyone not watching the network tab.
  expect(consoleErrorSpy).not.toHaveBeenCalled();

  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?child=hash-child-id&response=response-uuid",
  );

  jest.useRealTimers();
});

test("jsPsych's on_finish catches and logs errors thrown while waiting for pending uploads", async () => {
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

  const userFn = jest.fn();
  global.Request = jest.fn();

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      // Not an array, so `.map()` inside the try block throws synchronously —
      // this is what exercises the outer catch (Promise.allSettled itself
      // never rejects, so that's the only way into this catch block).
      pendingUploads: {},
    },
  });

  // Should not throw — error is caught internally
  await expect(
    on_finish(jsPsychMock as unknown as JsPsych, "some id", userFn)(data),
  ).resolves.toBeUndefined();

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error while waiting for pending uploads: ",
    expect.any(TypeError),
  );

  // Redirect still happens even though this failed.
  expect(global.window.location.replace).toHaveBeenCalledTimes(1);
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
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
    "https://example.com/exit?child=hash-child-id&response=response-uuid",
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://example.com/exit?existing=param&child=hash-child-id&response=response-uuid",
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "http://localhost/?child=hash-child-id&response=response-uuid",
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
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "some id")(data);
  expect(global.window.location.replace).toHaveBeenCalledWith(
    "https://done.com/?child=hash-child-id&response=response-uuid",
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

test("on_finish logs an error if saving the upload statuses (second write) fails", async () => {
  const displayElement = { innerHTML: "" };
  const jsPsychMock = {
    getDisplayElement: jest.fn(() => displayElement),
  };

  const exp_data: JsPsychExpData[] = [
    {
      trial_index: 0,
      trial_type: "html-keyboard-response",
      chs_recording: {
        filename: "vid.webm",
        is_session_recording: false,
        stream_time: null,
      },
    },
  ];
  const data = {
    /**
     * Mocked jsPsych Data Collection.
     *
     * @returns Exp data.
     */
    values: () => exp_data,
  } as unknown as DataCollection;

  // First (response data) write succeeds; second (upload statuses) write fails.
  const updateResponseSpy = jest
    .spyOn(Api, "updateResponse")
    .mockResolvedValueOnce({} as ApiResponseData)
    .mockRejectedValueOnce(new Error("second write failed"));
  jest.spyOn(Api, "finish").mockResolvedValue([]);

  Object.assign(window, {
    chs: {
      study: { attributes: { exit_url: "https://example.com/exit" } } as Study,
      child: { id: "child-id" } as Child,
      response: {
        id: "response-uuid",
        attributes: { hash_child_id: "hash-child-id" },
      },
      pastSessions: {} as Response[],
      pendingUploads: [
        { file: "vid.webm", promise: Promise.resolve(), status: "success" },
      ],
    },
  });

  await on_finish(jsPsychMock as unknown as JsPsych, "response-uuid")(data);

  // Two writes attempted: the initial save and the upload-status write.
  expect(updateResponseSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error while saving recording upload statuses: ",
    new Error("second write failed"),
  );
});

test("get_session_recording_data returns the session recorder's per-trial data when active", () => {
  const recordingData = {
    filename: "session.webm",
    is_session_recording: true,
    stream_time: { trial_start_ms: 100 },
  };
  const getSessionTrialRecordingData = jest.fn().mockReturnValue(recordingData);

  Object.assign(window, {
    chs: { sessionRecorder: { getSessionTrialRecordingData } },
  });

  expect(get_session_recording_data()).toBe(recordingData);
  expect(getSessionTrialRecordingData).toHaveBeenCalledTimes(1);
});

test("get_session_recording_data returns null when no session recording is active", () => {
  Object.assign(window, { chs: { sessionRecorder: null } });
  expect(get_session_recording_data()).toBeNull();
});

test("add_session_recording_data attaches recording data to a trial", () => {
  const data = {
    trial_index: 0,
    trial_type: "html-keyboard-response",
  } as JsPsychExpData;
  const recordingData = {
    filename: "session.webm",
    is_session_recording: true as const,
    stream_time: null,
  };

  add_session_recording_data(data, recordingData);
  expect(data.chs_recording).toBe(recordingData);
});

test("add_session_recording_data does nothing when there is no recording data", () => {
  const data = {
    trial_index: 0,
    trial_type: "html-keyboard-response",
  } as JsPsychExpData;

  add_session_recording_data(data, null);
  expect(data.chs_recording).toBeUndefined();
});

test("add_session_recording_data does not overwrite a trial's own recording data", () => {
  const existing = {
    filename: "own.webm",
    is_session_recording: false as const,
    stream_time: null,
  };
  const data = {
    trial_index: 0,
    trial_type: "start-record-plugin",
    chs_recording: existing,
  } as JsPsychExpData;
  const sessionData = {
    filename: "session.webm",
    is_session_recording: true as const,
    stream_time: null,
  };

  add_session_recording_data(data, sessionData);
  // The trial's own block is kept.
  expect(data.chs_recording).toBe(existing);
});
