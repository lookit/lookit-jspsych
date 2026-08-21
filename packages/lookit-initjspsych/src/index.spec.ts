import { Child, JsPsychExpData, Study } from "@lookit/data/dist/types";
import type { DataCollection } from "jspsych";
import * as jspsychModule from "jspsych";
import TestPlugin from "../fixtures/TestPlugin";
import lookitInitJsPsych from "./";
import { UndefinedTimelineError, UndefinedTypeError } from "./errors";
import type {
  ChsJsPsychPlugin,
  ChsTimelineArray,
  ChsTimelineDescription,
  ChsTrialDescription,
  JsPsychOptions,
} from "./types";

describe("lookit-initjspsych initializes and runs", () => {
  beforeEach(() => {
    TestPlugin.reset();
  });

  test("lookitInitJsPsych returns an instance of jspsych", () => {
    const jsPsych = lookitInitJsPsych("uuid-string");
    const opts = {
      on_data_update: jest.fn(),
      on_finish: jest.fn(),
    };
    expect(jsPsych(opts)).toBeInstanceOf(jspsychModule.JsPsych);
  });

  test("jsPsych's run is called", async () => {
    const mockRun = jest.fn();
    jest
      .spyOn(jspsychModule.JsPsych.prototype, "run")
      .mockImplementation(mockRun);
    const jsPsych = lookitInitJsPsych("some id");
    await jsPsych({}).run([]);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  test("jsPsych initializes with onDataUpdate/on_data_update when no init opts are provided", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => ({
            /**
             * Mock jsPsych.data.get().values() in the returned instance
             *
             * @returns Mocked data array
             */
            values: () => [] as JsPsychExpData[],
          }),
        },
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      // Dynamically import lookitInitJsPsych after mocking jsPsych/initJsPsych
      const { default: lookitInitJsPsych } = await import("./index");

      // Call with no user-defined init options
      lookitInitJsPsych("uuid")();

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];
      // The original initJsPsych function should be called with an on_data_update function
      // even though it was not passed in by the user (no opts argument)
      expect(typeof callArgs!.on_data_update).toBe("function");
    });
  });

  test("jsPsych initializes with onDataUpdate/on_data_update when init opts is empty", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => ({
            /**
             * Mock jsPsych.data.get().values() in the returned instance
             *
             * @returns Mocked data array
             */
            values: () => [] as JsPsychExpData[],
          }),
        },
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      // Dynamically import lookitInitJsPsych after mocking jsPsych/initJsPsych
      const { default: lookitInitJsPsych } = await import("./index");

      // call with empty opts object
      const opts: JsPsychOptions = {};
      lookitInitJsPsych("uuid")(opts);

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];
      // The original initJsPsych function should be called with an on_data_update function
      // even though it was not passed in by the user (empty opts argument)
      expect(typeof callArgs!.on_data_update).toBe("function");
    });
  });

  test("After initializing, when jsPsych data updates, onDataUpdate closure returns the on_data_update function with correct arguments", async () => {
    jest.doMock("jspsych", () => ({
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      initJsPsych: jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => ({
            /**
             * Mock jsPsych.data.get().values() in the returned instance
             *
             * @returns Mocked data array
             */
            values: () => [] as JsPsychExpData[],
          }),
        },
        run: jest.fn(),
      })),
    }));

    // Track API mocks separately so we can assert on them
    const mockRetrieveResponse = jest.fn().mockResolvedValue({
      attributes: { exp_data: [] },
    });
    const mockUpdateResponse = jest.fn().mockResolvedValue(undefined);
    const mockFinish = jest.fn().mockResolvedValue(undefined);

    // Mock Api from @lookit/data
    jest.doMock("@lookit/data", () => ({
      __esModule: true,
      default: {
        retrieveResponse: mockRetrieveResponse,
        updateResponse: mockUpdateResponse,
        finish: mockFinish,
      },
    }));

    // use jest.isolateModulesAsync to ensure that the mocks are applied before index.ts and its imports are loaded
    await jest.isolateModulesAsync(async () => {
      const { default: lookitInitJsPsych } = await import("./index");
      const { initJsPsych } = await import("jspsych");

      lookitInitJsPsych("uuid")({});

      const callArgs = (initJsPsych as jest.Mock).mock.calls[0][0];
      const onDataUpdate = callArgs.on_data_update!;

      // Simulate jsPsych calling onDataUpdate/on_data_update with trial data
      await expect(
        onDataUpdate({ trial_index: 0, trial_type: "test" } as unknown),
      ).resolves.not.toThrow();
      expect(mockRetrieveResponse).not.toHaveBeenCalled();
      expect(mockUpdateResponse).toHaveBeenCalledWith("uuid", {
        exp_data: [], // from jsPsych.data.get().values()
      });
      expect(mockFinish).toHaveBeenCalled();
    });
  });

  test("jsPsych initializes with onFinish/on_finish when no init opts are provided", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        /**
         * Mock for getDisplayElement
         *
         * @returns Object with an innerHTML property
         */
        getDisplayElement: () => ({
          /**
           * Mocked jsPsych.getDisplayElement().innerHTML used in on_finish
           *
           * @returns Empty string
           */
          innerHTML: "",
        }),
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      // Dynamically import lookitInitJsPsych after mocking jsPsych/initJsPsych
      const { default: lookitInitJsPsych } = await import("./index");

      // Call with no user-defined init options
      lookitInitJsPsych("uuid")();

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];
      // The original initJsPsych function should be called with an on_finish function
      // even though it was not passed in by the user (no opts argument)
      expect(typeof callArgs!.on_finish).toBe("function");
    });
  });

  test("jsPsych initializes with onFinish/on_finish when init opts is empty", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        /**
         * Mock for getDisplayElement
         *
         * @returns Object with an innerHTML property
         */
        getDisplayElement: () => ({
          /**
           * Mocked jsPsych.getDisplayElement().innerHTML used in on_finish
           *
           * @returns Empty string
           */
          innerHTML: "",
        }),
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      // Dynamically import lookitInitJsPsych after mocking jsPsych/initJsPsych
      const { default: lookitInitJsPsych } = await import("./index");

      // call with empty opts object
      const opts: JsPsychOptions = {};
      lookitInitJsPsych("uuid")(opts);

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];
      // The original initJsPsych function should be called with an on_finish function
      // even though it was not passed in by the user (empty opts argument)
      expect(typeof callArgs!.on_finish).toBe("function");
    });
  });

  test("After initializing, when jsPsych finishes, onFinish closure returns the on_finish function with correct arguments", async () => {
    // needed to stub out the window.location.replace call inside on_finish
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        replace: jest.fn(),
      },
      writable: true,
    });

    Object.assign(window, {
      chs: {
        study: {
          attributes: { exit_url: "https://example.com/exit" },
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

    const exp_data = [{ key: "value" }];
    const data = {
      /**
       * Mocked jsPsych Data Collection.
       *
       * @returns Exp data.
       */
      values: () => exp_data,
    } as DataCollection;

    jest.doMock("jspsych", () => ({
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      initJsPsych: jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => data,
        },
        /**
         * Mock for getDisplayElement
         *
         * @returns Object with an innerHTML property
         */
        getDisplayElement: () => ({
          /**
           * Mocked jsPsych.getDisplayElement().innerHTML used in on_finish
           *
           * @returns Empty string
           */
          innerHTML: "",
        }),
        run: jest.fn(),
      })),
    }));

    // Track API mocks separately so we can assert on them
    const mockRetrieveResponse = jest.fn().mockResolvedValue({
      attributes: { exp_data: [] },
    });
    const mockUpdateResponse = jest.fn().mockResolvedValue(undefined);
    const mockFinish = jest.fn().mockResolvedValue(undefined);

    // Mock Api from @lookit/data
    jest.doMock("@lookit/data", () => ({
      __esModule: true,
      default: {
        retrieveResponse: mockRetrieveResponse,
        updateResponse: mockUpdateResponse,
        finish: mockFinish,
      },
    }));

    // use jest.isolateModulesAsync to ensure that the mocks are applied before index.ts and its imports are loaded
    await jest.isolateModulesAsync(async () => {
      const { default: lookitInitJsPsych } = await import("./index");
      const { initJsPsych } = await import("jspsych");

      lookitInitJsPsych("uuid")({});

      const callArgs = (initJsPsych as jest.Mock).mock.calls[0][0];
      const onFinish = callArgs.on_finish!;

      // Simulate jsPsych calling onFinish/on_finish with data collection
      await expect(onFinish(data)).resolves.not.toThrow();
      expect(mockRetrieveResponse).not.toHaveBeenCalled();
      expect(mockUpdateResponse).toHaveBeenCalledWith("uuid", {
        exp_data: [{ key: "value" }], // from mocked data.values()
        completed: true,
      });
      expect(mockFinish).toHaveBeenCalled();
    });
  });
});

describe("lookit-initjspsych data handling", () => {
  beforeEach(() => {
    TestPlugin.reset();
  });

  test("Experiment data is injected into timeline w/o data", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const trial: ChsTrialDescription = { type: TestPlugin };
    const t: ChsTimelineArray = [trial];

    await jsPsych({}).run(t);
    // TestPlugin has a chsData() method that returns { chs_type: "test" }
    expect((t[0] as ChsTrialDescription).data).toMatchObject({
      chs_type: "test",
    });
  });

  test("Experiment data is injected into timeline w/ data", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const trial: ChsTrialDescription = {
      type: TestPlugin,
      data: { other: "data" },
    };
    const t: ChsTimelineArray = [trial];

    await jsPsych({}).run(t);
    expect((t[0] as ChsTrialDescription).data).toMatchObject({
      chs_type: "test",
      other: "data",
    });
  });

  test("User on_data_update and other options are passed through to initJsPsych", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => ({
            /**
             * Mock jsPsych.data.get().values() in the returned instance
             *
             * @returns Mocked data array
             */
            values: () => [] as JsPsychExpData[],
          }),
        },
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      const { default: lookitInitJsPsych } = await import("./index");

      // User-specified on_data_update
      const userOnDataUpdate = jest.fn();

      // Any extra user-specified initJsPsych options that should be passed directly to the original initJsPsych
      const otherInitOptions = { default_iti: 500 };

      const opts: JsPsychOptions = {
        on_data_update: userOnDataUpdate,
        ...otherInitOptions,
      } as JsPsychOptions;

      lookitInitJsPsych("uuid")(opts);

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];

      // (1) We always replace on_data_update with a closure in the original initJsPsych,
      // so that parameter will exist and not match the user-defined function
      expect(callArgs!.on_data_update).not.toBe(userOnDataUpdate);
      expect(typeof callArgs!.on_data_update).toBe("function");

      // (2) Any other user-specified init options are passed through untouched
      expect(callArgs!.default_iti).toBe(500);
    });
  });

  test("User on_finish and other options are passed through to initJsPsych", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        data: {
          /**
           * Mock jsPsych.data.get in the returned instance
           *
           * @returns Data collection with a values() method
           */
          get: () => ({
            /**
             * Mock jsPsych.data.get().values() in the returned instance
             *
             * @returns Mocked data array
             */
            values: () => [] as JsPsychExpData[],
          }),
        },
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      const { default: lookitInitJsPsych } = await import("./index");

      // User-specified on_finish
      const userOnFinish = jest.fn();

      // Any extra user-specified initJsPsych options that should be passed directly to the original initJsPsych
      const otherInitOptions = { default_iti: 500 } as JsPsychOptions;

      const opts: JsPsychOptions = {
        on_finish: userOnFinish,
        ...otherInitOptions,
      } as JsPsychOptions;

      lookitInitJsPsych("uuid")(opts);

      expect(mockInitJsPsych).toHaveBeenCalled();
      const callArgs = mockInitJsPsych.mock.calls[0][0];

      // (1) We always replace on_finish with a closure in the original initJsPsych,
      // so that parameter will exist and not match the user-defined function
      expect(callArgs!.on_finish).not.toBe(userOnFinish);
      expect(typeof callArgs!.on_finish).toBe("function");

      // (2) Any other user-specified init options are passed through untouched
      expect(callArgs!.default_iti).toBe(500);
    });
  });

  test("on_trial_start/on_trial_finish hooks capture and attach session recording data and call the user's callbacks", async () => {
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockInitJsPsych = jest.fn((opts?: JsPsychOptions) => ({
        run: jest.fn(),
      }));

      jest.mock("jspsych", () => ({
        initJsPsych: mockInitJsPsych,
      }));

      const { default: lookitInitJsPsych } = await import("./index");

      // Simulate an active session recording.
      const recordingData = {
        filename: "session.webm",
        is_session_recording: true,
        stream_time: { trial_start_ms: 50 },
      };
      Object.assign(window, {
        chs: {
          sessionRecorder: {
            getSessionTrialRecordingData: jest
              .fn()
              .mockReturnValue(recordingData),
          },
        },
      });

      const userOnTrialStart = jest.fn();
      const userOnTrialFinish = jest.fn();

      lookitInitJsPsych("uuid")({
        on_trial_start: userOnTrialStart,
        on_trial_finish: userOnTrialFinish,
      } as JsPsychOptions);

      const callArgs = mockInitJsPsych.mock.calls[0][0];

      // on_trial_start captures session data and forwards to the user's callback.
      const trial = { type: TestPlugin } as unknown as ChsTrialDescription;
      callArgs!.on_trial_start!(trial as never);
      expect(userOnTrialStart).toHaveBeenCalledWith(trial);

      // on_trial_finish attaches the captured data and forwards to the user's callback.
      const data = {
        trial_index: 0,
        trial_type: "test",
      } as JsPsychExpData;
      callArgs!.on_trial_finish!(data as never);
      expect(data.chs_recording).toBe(recordingData);
      expect(userOnTrialFinish).toHaveBeenCalledWith(data);
    });
  });
});

describe("lookit-initjspsych timeline/trial handling", () => {
  beforeEach(() => {
    TestPlugin.reset();
  });

  test("Throws UndefinedTypeError when trial description has no type", () => {
    const jsPsych = lookitInitJsPsych("some id");
    [
      [
        {
          type: undefined,
          data: { other: "data" },
        } as unknown as ChsTrialDescription,
      ],
      [
        {
          type: null,
          data: { other: "data" },
        } as unknown as ChsTrialDescription,
      ],
    ].forEach((t) => {
      expect(
        async () => await jsPsych({}).run(t as ChsTimelineArray),
      ).rejects.toThrow(UndefinedTypeError);
    });
  });

  test("Does the experiment run when the timeline contains a valid timeline node?", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const timeline_node: ChsTimelineDescription = {
      timeline: [
        {
          timeline: [{ type: TestPlugin, data: { other: "data" } }],
        },
      ],
    };
    const t: ChsTimelineArray = [timeline_node];

    await jsPsych({}).run(t);

    const trial_data = (
      ((t[0] as ChsTimelineDescription).timeline[0] as ChsTimelineDescription)
        .timeline[0] as ChsTrialDescription
    ).data;
    expect(trial_data).toMatchObject({ chs_type: "test", other: "data" });
  });

  test("Throws UndefinedTimelineError when timeline object is invalid", () => {
    const jsPsych = lookitInitJsPsych("some id");

    const t1 = [
      { timeline: { type: TestPlugin } },
    ] as unknown as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t1 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t2 = [{ timeline: true }] as unknown as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t2 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t3 = [true] as unknown as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t3 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t4 = [42] as unknown as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t4 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);
  });

  test("When the timeline array element is an array, handleTrialTypes is called on that array", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const timeline_node_nested_array: ChsTimelineDescription = {
      timeline: [[{ type: TestPlugin, data: { other: "data" } }]],
    };
    const t: ChsTimelineArray = [timeline_node_nested_array];

    await jsPsych({}).run(t);

    const outerTimelineNode = t[0] as ChsTimelineDescription;
    const trial_data = (
      (
        outerTimelineNode.timeline[0] as ChsTimelineArray
      )[0] as ChsTrialDescription
    ).data;
    expect(trial_data).toMatchObject({ chs_type: "test", other: "data" });
  });

  test("When a trial description contains a type and nested timeline, handleTrialTypes treats it as a trial instead of timeline node", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const nested_timeline: ChsTrialDescription = {
      type: TestPlugin,
      timeline: [{ data: { trialnumber: 1 } }, { data: { trialnumber: 2 } }],
    };
    const t: ChsTimelineArray = [nested_timeline];

    await jsPsych({}).run(t);

    expect((t[0] as ChsTrialDescription).data).toMatchObject({
      chs_type: "test",
    });
  });

  test("When a trial description contains a nested timeline with no type, handleTrialTypes handles it as a timeline node", async () => {
    const jsPsych = lookitInitJsPsych("some id");
    const nested_timeline = {
      data: { somekey: "somevalue" },
      timeline: [{ type: TestPlugin }, { type: TestPlugin }],
    } as unknown as ChsTrialDescription;
    const t: ChsTimelineArray = [nested_timeline];

    await jsPsych({}).run(t);

    // lookit-initjspsych should get the CHS data from TestPlugin and add it as data in the nested timeline.
    expect((t[0] as ChsTrialDescription).data).toMatchObject({
      somekey: "somevalue",
    });
    expect((t[0] as ChsTrialDescription).timeline[0].data).toMatchObject({
      chs_type: "test",
    });
    expect((t[0] as ChsTrialDescription).timeline[1].data).toMatchObject({
      chs_type: "test",
    });
  });
});

describe("lookit-initjspsych assent-video abort on 'no' response", () => {
  // Minimal mock that satisfies jsPsych's plugin interface and has info.name === "assent-video".
  /** Mock assent-video plugin for testing on_finish wrapping behavior. */
  class MockAssentVideoPlugin {
    public static info = {
      name: "assent-video",
      version: "0.0.1",
      parameters: {},
      data: {},
    };

    /**
     * Mock constructor.
     *
     * @param _ - JsPsych instance (unused in mock)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public constructor(_: unknown) {}

    /**
     * Immediately resolves the trial.
     *
     * @param _display - Display element (unused)
     * @param _trial - Trial data (unused)
     * @param on_load - Called when the trial has loaded
     * @returns Resolved promise.
     */
    public trial(_display: HTMLElement, _trial: unknown, on_load: () => void) {
      on_load();
      return Promise.resolve();
    }
  }

  beforeEach(() => {
    TestPlugin.reset();
  });

  test("Wraps on_finish to call abortExperiment when response is false when no user on_finish is defined", async () => {
    const initFn = lookitInitJsPsych("some id");
    const jsPsychInstance = initFn({});
    const abortSpy = jest
      .spyOn(jsPsychInstance, "abortExperiment")
      .mockImplementation(() => {});

    const trial: ChsTrialDescription = {
      type: MockAssentVideoPlugin as unknown as ChsJsPsychPlugin,
    };
    await jsPsychInstance.run([trial]);

    expect(typeof trial.on_finish).toBe("function");
    trial.on_finish!({ response: false });
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  test("Wraps on_finish to call abortExperiment when response is false, and calls the user's function", async () => {
    const initFn = lookitInitJsPsych("some id");
    const jsPsychInstance = initFn({});
    const abortSpy = jest
      .spyOn(jsPsychInstance, "abortExperiment")
      .mockImplementation(() => {});
    const userOnFinish = jest.fn();

    const trial: ChsTrialDescription = {
      type: MockAssentVideoPlugin as unknown as ChsJsPsychPlugin,
      on_finish: userOnFinish,
    };
    await jsPsychInstance.run([trial]);

    trial.on_finish!({ response: false });
    expect(userOnFinish).toHaveBeenCalledWith({ response: false });
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  test("Does not call abortExperiment when assent-video response is true", async () => {
    const initFn = lookitInitJsPsych("some id");
    const jsPsychInstance = initFn({});
    const abortSpy = jest
      .spyOn(jsPsychInstance, "abortExperiment")
      .mockImplementation(() => {});

    const trial: ChsTrialDescription = {
      type: MockAssentVideoPlugin as unknown as ChsJsPsychPlugin,
    };
    await jsPsychInstance.run([trial]);

    trial.on_finish!({ response: true });
    expect(abortSpy).not.toHaveBeenCalled();
  });

  test("Still calls a user's on_finish function when assent-video response is true", async () => {
    const initFn = lookitInitJsPsych("some id");
    const jsPsychInstance = initFn({});
    const abortSpy = jest
      .spyOn(jsPsychInstance, "abortExperiment")
      .mockImplementation(() => {});
    const userOnFinish = jest.fn();

    const trial: ChsTrialDescription = {
      type: MockAssentVideoPlugin as unknown as ChsJsPsychPlugin,
      on_finish: userOnFinish,
    };
    await jsPsychInstance.run([trial]);

    trial.on_finish!({ response: true });
    expect(userOnFinish).toHaveBeenCalledWith({ response: true });
    expect(abortSpy).not.toHaveBeenCalled();
  });

  test("Does not wrap on_finish for non-assent-video plugin types", async () => {
    const initFn = lookitInitJsPsych("some id");
    const jsPsychInstance = initFn({});
    const abortSpy = jest
      .spyOn(jsPsychInstance, "abortExperiment")
      .mockImplementation(() => {});

    const trial: ChsTrialDescription = { type: TestPlugin };
    await jsPsychInstance.run([trial]);

    expect(trial.on_finish).toBeUndefined();
    expect(abortSpy).not.toHaveBeenCalled();
  });
});
