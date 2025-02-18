import { JsPsych } from "jspsych";
import TestPlugin from "../fixtures/TestPlugin";
import lookitInitJsPsych from "./";
import { UndefinedTimelineError, UndefinedTypeError } from "./errors";
import type {
  ChsJsPsych,
  ChsTimelineArray,
  ChsTimelineDescription,
  ChsTrialDescription,
} from "./types";

describe("lookit-initjspsych", () => {
  beforeEach(() => {
    TestPlugin.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Does lookitInitJsPsych return an instance of jspsych?", () => {
    const jsPsych: ChsJsPsych = lookitInitJsPsych("uuid-string");
    const opts = {
      on_data_update: jest.fn(),
      on_finish: jest.fn(),
    };
    expect(jsPsych(opts)).toBeInstanceOf(JsPsych);
  });

  test("Is jspsych's run called?", async () => {
    const mockRun = jest.fn();
    jest.spyOn(JsPsych.prototype, "run").mockImplementation(mockRun);
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
    await jsPsych({}).run([]);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  test("Is experiment data injected into timeline w/o data?", async () => {
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
    const trial: ChsTrialDescription = { type: TestPlugin };
    const t: ChsTimelineArray = [trial];

    await jsPsych({}).run(t);
    // TestPlugin has a chsData() method that returns { chs_type: "test" }
    expect((t[0] as ChsTrialDescription).data).toMatchObject({
      chs_type: "test",
    });
  });

  test("Is experiment data injected into timeline w/ data?", async () => {
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

  test("Throws UndefinedTypeError when trial description has no type", () => {
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
    [
      [{ type: undefined, data: { other: "data" } } as ChsTrialDescription],
      [{ type: null, data: { other: "data" } } as ChsTrialDescription],
    ].forEach((t) => {
      expect(
        async () => await jsPsych({}).run(t as ChsTimelineArray),
      ).rejects.toThrow(UndefinedTypeError);
    });
  });

  test("Does the experiment run when the timeline contains a valid timeline node?", async () => {
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
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
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");

    const t1 = [{ timeline: { type: TestPlugin } }] as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t1 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t2 = [{ timeline: true }] as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t2 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t3 = [true] as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t3 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);

    const t4 = [42] as ChsTimelineArray;

    expect(
      async () => await jsPsych({}).run(t4 as ChsTimelineArray),
    ).rejects.toThrow(UndefinedTimelineError);
  });

  test("When the timeline array element is an array, handleTrialTypes is called on that array", async () => {
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
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
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
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
    const jsPsych: ChsJsPsych = lookitInitJsPsych("some id");
    const nested_timeline: ChsTrialDescription = {
      data: { somekey: "somevalue" },
      timeline: [{ type: TestPlugin }, { type: TestPlugin }],
    };
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
