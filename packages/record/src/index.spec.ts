import { LookitWindow } from "@lookit/data/dist/types";
import { initJsPsych, PluginInfo, TrialType } from "jspsych";
import { ExistingRecordingError, NoSessionRecordingError } from "./errors";
import Rec from "./index";
import Recorder from "./recorder";

declare const window: LookitWindow;

jest.mock("./recorder");
jest.mock("@lookit/data");
jest.mock("jspsych", () => ({
  ...jest.requireActual("jspsych"),
  initJsPsych: jest.fn().mockReturnValue({
    finishTrial: jest.fn().mockImplementation(),
    getCurrentTrial: jest
      .fn()
      .mockReturnValue({ type: { info: { name: "test-type" } } }),
  }),
}));

/**
 * Manual mock to set up window.chs value for testing.
 *
 * @param chs - Contents of chs storage.
 */
const setCHSValue = (chs = {}) => {
  Object.defineProperty(global, "window", {
    value: {
      chs,
    },
  });
};

beforeEach(() => {
  setCHSValue();
});

afterEach(() => {
  jest.clearAllMocks();
});

test("Trial recording", () => {
  const mockRecStart = jest.spyOn(Recorder.prototype, "start");
  const mockRecStop = jest.spyOn(Recorder.prototype, "stop");
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);
  const getCurrentPluginNameSpy = jest.spyOn(trialRec, "getCurrentPluginName");

  trialRec.on_start();
  trialRec.on_load();
  trialRec.on_finish();

  expect(Recorder).toHaveBeenCalledTimes(1);
  expect(mockRecStart).toHaveBeenCalledTimes(1);
  expect(mockRecStart).toHaveBeenCalledWith(false, "test-type");
  expect(mockRecStop).toHaveBeenCalledTimes(1);
  expect(getCurrentPluginNameSpy).toHaveBeenCalledTimes(1);
});

test("Trial recording's initialize does nothing", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  expect(await trialRec.initialize()).toBeUndefined();
  expect(Recorder).toHaveBeenCalledTimes(0);
});

test("Start Recording", async () => {
  const mockRecStart = jest.spyOn(Recorder.prototype, "start");
  const jsPsych = initJsPsych();
  const startRec = new Rec.StartRecordPlugin(jsPsych);

  // manual mock
  mockRecStart.mockImplementation(jest.fn().mockReturnValue(Promise.resolve()));

  await startRec.trial();

  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(() => {
    new Rec.StartRecordPlugin(jsPsych);
  }).toThrow(ExistingRecordingError);
});

test("Stop Recording", async () => {
  const mockRecStop = jest.spyOn(Recorder.prototype, "stop");
  const jsPsych = initJsPsych();

  setCHSValue({
    sessionRecorder: new Recorder(jsPsych),
  });

  const stopRec = new Rec.StopRecordPlugin(jsPsych);
  const display_element = jest
    .fn()
    .mockImplementation() as unknown as HTMLElement;

  mockRecStop.mockImplementation(jest.fn().mockReturnValue(Promise.resolve()));

  const trial = {
    locale: "en-us",
  } as unknown as TrialType<PluginInfo>;

  await stopRec.trial(display_element, trial);

  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
  expect(display_element.innerHTML).toStrictEqual("");

  setCHSValue();

  expect(async () => await new Rec.StopRecordPlugin(jsPsych)).rejects.toThrow(
    NoSessionRecordingError,
  );
});
