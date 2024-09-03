import { JsPsych } from "jspsych";
import lookitInitJsPsych from "./";
import { Timeline } from "./types";

afterEach(() => {
  jest.clearAllMocks();
});

/**
 * Mocked chs data function used in testing below.
 *
 * @returns CHS experiment data.
 */
const chsData = () => ({ key: "value" });

test("Does lookitInitJsPsych return an instance of jspsych?", () => {
  const jsPsych = lookitInitJsPsych("uuid-string");
  const opts = {
    on_data_update: jest.fn(),
    on_finish: jest.fn(),
  };
  expect(jsPsych(opts)).toBeInstanceOf(JsPsych);
});

test("Is jspsych's run called?", async () => {
  const mockRun = jest.fn();
  jest.spyOn(JsPsych.prototype, "run").mockImplementation(mockRun);
  const jsPsych = lookitInitJsPsych("some id");
  await jsPsych({}).run([]);
  expect(mockRun).toHaveBeenCalledTimes(1);
});

test("Is experiment data injected into timeline w/o data?", async () => {
  const jsPsych = lookitInitJsPsych("some id");
  const t: Timeline[] = [{ type: { chsData } }];

  await jsPsych({}).run(t);
  expect(t[0].data).toMatchObject({ key: "value" });
});

test("Is experiment data injected into timeline w/ data?", async () => {
  const jsPsych = lookitInitJsPsych("some id");
  const t: Timeline[] = [{ type: { chsData }, data: { other: "data" } }];

  await jsPsych({}).run(t);
  expect(t[0].data).toMatchObject({ key: "value", other: "data" });
});
