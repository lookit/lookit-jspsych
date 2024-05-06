import { JsPsych } from "jspsych";
import lookitInitJsPsych from "./";

const mockRun = jest.fn();
jest.spyOn(JsPsych.prototype, "run").mockImplementation(mockRun);

test("Does lookitInitJsPsych return an instance of jspsych?", () => {
  const jsPsych = lookitInitJsPsych("uuid-string");
  const opts = {
    on_data_update: jest.fn(),
    on_finish: jest.fn(),
  };
  expect(jsPsych(opts)).toBeInstanceOf(JsPsych);
});

test("Is jspsych's run called?", async () => {
  const jsPsych = lookitInitJsPsych("some id");
  await jsPsych({}).run([]);
  expect(mockRun).toHaveBeenCalledTimes(1);
});
