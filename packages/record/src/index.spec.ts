import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { initJsPsych, PluginInfo, TrialType } from "jspsych";
import { ExistingRecordingError, NoSessionRecordingError } from "./errors";
import Rec from "./index";
import Recorder from "./recorder";

declare const window: LookitWindow;

let global_display_el: HTMLDivElement;

jest.mock("./recorder");
jest.mock("@lookit/data");
jest.mock("jspsych", () => ({
  ...jest.requireActual("jspsych"),
  initJsPsych: jest.fn().mockImplementation(() => {
    // create a new display element for each jsPsych instance
    global_display_el = document.createElement("div");
    return {
      finishTrial: jest.fn().mockImplementation(),
      getCurrentTrial: jest
        .fn()
        .mockReturnValue({ type: { info: { name: "test-type" } } }),
      getDisplayElement: jest.fn(() => global_display_el),
    };
  }),
}));

/**
 * Manual mock to set up window.chs value for testing.
 *
 * @param chs - Contents of chs storage.
 */
const setCHSValue = (chs = {}) => {
  Object.defineProperty(window, "chs", {
    value: chs,
    configurable: true,
    writable: true,
  });
};

beforeEach(() => {
  setCHSValue();
});

afterEach(() => {
  jest.restoreAllMocks();
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

test("Trial recording's initialize with no parameters", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  expect(await trialRec.initialize()).toBeUndefined();
  expect(trialRec["uploadMsg"]).toBeNull;
  expect(trialRec["locale"]).toBe("en-us");
  expect(Recorder).toHaveBeenCalledTimes(0);
});

test("Trial recording's initialize with locale parameter", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  expect(await trialRec.initialize({ locale: "fr" })).toBeUndefined();
  expect(trialRec["locale"]).toBe("fr");
  expect(trialRec["uploadMsg"]).toBeNull;
  expect(Recorder).toHaveBeenCalledTimes(0);
});

test("Trial recording's initialize with wait_for_upload_message parameter", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  expect(
    await trialRec.initialize({ wait_for_upload_message: "Please wait..." }),
  ).toBeUndefined();
  expect(trialRec["uploadMsg"]).toBe("Please wait...");
  expect(trialRec["locale"]).toBe("en-us");
  expect(Recorder).toHaveBeenCalledTimes(0);
});

test("Trial recording start with locale parameter", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  await trialRec.initialize();

  expect(trialRec["uploadMsg"]).toBeNull;
  expect(trialRec["locale"]).toBe("en-us");
  expect(Recorder).toHaveBeenCalledTimes(0);

  trialRec.on_start({ locale: "fr" });

  expect(trialRec["uploadMsg"]).toBeNull;
  expect(trialRec["locale"]).toBe("fr");
  expect(Recorder).toHaveBeenCalledTimes(1);
});

test("Trial recording start with wait_for_upload_message parameter", async () => {
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  await trialRec.initialize();

  expect(trialRec["uploadMsg"]).toBeNull;
  expect(trialRec["locale"]).toBe("en-us");
  expect(Recorder).toHaveBeenCalledTimes(0);

  trialRec.on_start({ wait_for_upload_message: "Please wait..." });

  expect(trialRec["uploadMsg"]).toBe("Please wait...");
  expect(trialRec["locale"]).toBe("en-us");
  expect(Recorder).toHaveBeenCalledTimes(1);
});

test("Trial recording stop/finish with default uploading msg in English", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const params = {
    locale: "en-us",
    wait_for_upload_message: null,
  };
  await trialRec.initialize(params);
  trialRec.on_start();
  trialRec.on_load();

  // call on_finish but don't await so that we can inspect before it resolves
  trialRec.on_finish();

  expect(global_display_el.innerHTML).toBe(
    chsTemplates.uploadingVideo({
      type: jsPsych.getCurrentTrial().type,
      locale: params.locale,
    } as TrialType<PluginInfo>),
  );
  expect(global_display_el.innerHTML).toBe(
    "<div>uploading video, please wait...</div>",
  );
  //expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);

  // resolve the stop promise
  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with different locale should display default uploading msg in specified language", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const params = {
    locale: "fr",
    wait_for_upload_message: null,
  };
  await trialRec.initialize(params);
  trialRec.on_start();
  trialRec.on_load();

  // call on_finish but don't await so that we can inspect before it resolves
  trialRec.on_finish();

  expect(global_display_el.innerHTML).toBe(
    chsTemplates.uploadingVideo({
      type: jsPsych.getCurrentTrial().type,
      locale: params.locale,
    } as TrialType<PluginInfo>),
  );
  expect(global_display_el.innerHTML).toBe(
    "<div>téléchargement video en cours, veuillez attendre...</div>",
  );
  //expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);

  // resolve the stop promise
  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with custom uploading message", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const params = {
    wait_for_upload_message: "Wait!",
  };
  await trialRec.initialize(params);
  trialRec.on_start();
  trialRec.on_load();

  // call on_finish but don't await so that we can inspect before it resolves
  trialRec.on_finish();

  expect(global_display_el.innerHTML).toBe("Wait!");
  //expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);

  // resolve the stop promise
  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording rejection path (failure during upload)", async () => {
  // Create a controlled promise and capture the reject function
  let rejectStop!: (err: unknown) => void;
  const stopPromise = new Promise<void>((_, reject) => {
    rejectStop = reject;
  });

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  await trialRec.initialize();
  trialRec.on_start();
  trialRec.on_load();

  // call on_finish but don't await so that we can inspect before it resolves
  trialRec.on_finish();

  // Should show initial wait for upload message
  expect(global_display_el.innerHTML).toBe(
    "<div>uploading video, please wait...</div>",
  );

  // Reject stop
  rejectStop(new Error("upload failed"));

  // Wait for plugin's `.catch()` handler to run
  await Promise.resolve();

  // TO DO: modify the trial extension code to display translated error msg and/or researcher contact info
  expect(global_display_el.innerHTML).toBe(
    "<div>uploading video, please wait...</div>",
  );
});

test("Start session recording", async () => {
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

test("Stop session recording", async () => {
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

test("Stop session recording should display default uploading msg in English", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();

  setCHSValue({
    sessionRecorder: new Recorder(jsPsych),
  });

  const stop_rec_plugin = new Rec.StopRecordPlugin(jsPsych);
  const display_element = document.createElement("div");

  const trial = {
    type: Rec.StopRecordPlugin.info.name,
    locale: "en-us",
    wait_for_upload_message: null,
  } as unknown as TrialType<PluginInfo>; // need to cast here because the "type" param is a string and should be a class

  // call trial but don't await so that we can inspect before it resolves
  stop_rec_plugin.trial(display_element, trial);

  expect(display_element.innerHTML).toBe(chsTemplates.uploadingVideo(trial));
  expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);

  // resolve the stop promise
  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop session recording with different locale should display default uploading msg in specified language", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();

  setCHSValue({
    sessionRecorder: new Recorder(jsPsych),
  });

  const stop_rec_plugin = new Rec.StopRecordPlugin(jsPsych);
  const display_element = document.createElement("div");

  // set locale to fr
  const trial = {
    type: Rec.StopRecordPlugin.info.name,
    locale: "fr",
    wait_for_upload_message: null,
  } as unknown as TrialType<PluginInfo>; // need to cast here because the "type" param is a string and should be a class

  // call trial but don't await so that we can inspect before it resolves
  stop_rec_plugin.trial(display_element, trial);

  const fr_uploading_msg = chsTemplates.uploadingVideo(trial);

  // check that fr translation is used
  expect(fr_uploading_msg).toBe(
    "<div>téléchargement video en cours, veuillez attendre...</div>",
  );
  expect(display_element.innerHTML).toBe(fr_uploading_msg);
  expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);

  // resolve the stop promise
  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop session recording with custom uploading message", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: () => void;
  const stopPromise = new Promise<void>((res) => (resolveStop = res));

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  setCHSValue({ sessionRecorder: new Recorder(jsPsych) });

  const stop_rec_plugin = new Rec.StopRecordPlugin(jsPsych);
  const display_element = document.createElement("div");

  const trial = {
    type: Rec.StopRecordPlugin.info.name,
    locale: "en-us",
    wait_for_upload_message: "<p>Custom message…</p>",
  } as unknown as TrialType<PluginInfo>; // need to cast here because the "type" param is a string and should be a class

  stop_rec_plugin.trial(display_element, trial);

  // check display before stop is resolved
  expect(display_element.innerHTML).toBe("<p>Custom message…</p>");

  resolveStop();
  await stopPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop recording rejection path (failure during upload)", async () => {
  // Create a controlled promise and capture the reject function
  let rejectStop!: (err: unknown) => void;
  const stopPromise = new Promise<void>((_, reject) => {
    rejectStop = reject;
  });

  jest.spyOn(Recorder.prototype, "stop").mockReturnValue(stopPromise);

  const jsPsych = initJsPsych();
  setCHSValue({ sessionRecorder: new Recorder(jsPsych) });

  const stop_rec_plugin = new Rec.StopRecordPlugin(jsPsych);
  const display_element = document.createElement("div");

  const trial = {
    type: Rec.StopRecordPlugin.info.name,
    locale: "en-us",
    wait_for_upload_message: "Wait…",
  } as unknown as TrialType<PluginInfo>; // need to cast here because the "type" param is a string and should be a class

  stop_rec_plugin.trial(display_element, trial);

  // Should show initial wait for upload message
  expect(display_element.innerHTML).toBe("Wait…");

  // Reject stop
  rejectStop(new Error("upload failed"));

  // Wait for plugin's `.catch()` handler to run
  await Promise.resolve();

  // Trial doesn't end and the cleanup tasks don't run.
  // TO DO: modify the plugin code to display translated error msg and/or researcher contact info
  expect(display_element.innerHTML).toBe("Wait…");
  expect(jsPsych.finishTrial).not.toHaveBeenCalled();
  expect(window.chs.sessionRecorder).not.toBeNull();
});
