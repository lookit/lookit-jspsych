import { JsPsychExpData } from "@lookit/data/dist/types";
import * as jspsychModule from "jspsych";
import TestPlugin from "../fixtures/TestPlugin";
import lookitInitJsPsych from "./";
import { UndefinedTimelineError, UndefinedTypeError } from "./errors";
import type {
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
      const otherInitOptions = { on_finish: jest.fn() };

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
      expect(typeof callArgs!.on_finish).toBe("function");
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
