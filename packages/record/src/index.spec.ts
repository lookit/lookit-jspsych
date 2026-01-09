import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { initJsPsych, PluginInfo, TrialType } from "jspsych";
import { ExistingRecordingError, NoSessionRecordingError } from "./errors";
import Rec from "./index";
import Recorder from "./recorder";
import type { StopResult } from "./types";

declare const window: LookitWindow;

let global_display_el: HTMLDivElement;

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

test("Trial recording", async () => {
  const mockRecStart = jest.spyOn(Recorder.prototype, "start");
  const mockRecStop = jest.spyOn(Recorder.prototype, "stop").mockReturnValue({
    stopped: Promise.resolve("url"),
    uploaded: Promise.resolve(),
  });
  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);
  const getCurrentPluginNameSpy = jest.spyOn(trialRec, "getCurrentPluginName");

  trialRec.on_start();
  trialRec.on_load();
  await trialRec.on_finish();

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
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // resolve the stop promise
  resolveStop("url");
  await stopPromise;
  // resolve the upload promise
  resolveUpload();
  await uploadPromise;

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with different locale should display default uploading msg in specified language", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // resolve the stop promise
  resolveStop("url");
  await stopPromise;
  // resolve the upload promise
  resolveUpload();
  await uploadPromise;

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with custom uploading message", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // resolve the stop promise
  resolveStop("url");
  await stopPromise;
  resolveUpload();
  await uploadPromise;

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish timeout with default parameters", async () => {
  // simulate a resolved stop promise and timeout upload promise
  const stopPromise = new Promise<string>((res) => res("url"));
  const uploadPromise = new Promise<string>((res) => res("timeout"));

  const recStopSpy = jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  await trialRec.initialize();
  trialRec.on_start();
  trialRec.on_load();

  await trialRec.on_finish();

  // recorder.stop should be called with the default max upload duration
  expect(recStopSpy).toHaveBeenCalledWith({
    upload_timeout_ms: 10000,
    upload_timeout_message: "Trial recording upload timed out",
  });

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with max upload duration initialize parameter", async () => {
  // simulate a resolved stop promise and timeout upload promise
  const stopPromise = new Promise<string>((res) => res("url"));
  const uploadPromise = new Promise<string>((res) => res("timeout"));

  const recStopSpy = jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const params = {
    max_upload_seconds: 20,
  };

  await trialRec.initialize(params);
  trialRec.on_start();
  trialRec.on_load();

  await trialRec.on_finish();

  // recorder.stop should be called with 20 seconds as the max upload duration
  expect(recStopSpy).toHaveBeenCalledWith({
    upload_timeout_ms: 20000,
    upload_timeout_message: "Trial recording upload timed out",
  });

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with max upload duration start parameter", async () => {
  // simulate a resolved stop promise and timeout upload promise
  const stopPromise = new Promise<string>((res) => res("url"));
  const uploadPromise = new Promise<string>((res) => res("timeout"));

  const recStopSpy = jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const initParams = {
    max_upload_seconds: null,
  };
  const startParams = {
    max_upload_seconds: 20,
  };

  await trialRec.initialize(initParams);
  trialRec.on_start(startParams);
  trialRec.on_load();

  await trialRec.on_finish();

  // recorder.stop should be called with 20 seconds as the max upload duration
  expect(recStopSpy).toHaveBeenCalledWith({
    upload_timeout_ms: 20000,
    upload_timeout_message: "Trial recording upload timed out",
  });

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop/finish with null max upload duration", async () => {
  // simulate a resolved stop promise and resolved upload promise
  const stopPromise = new Promise<string>((res) => res("url"));
  const uploadPromise = new Promise<void>((res) => res());

  const recStopSpy = jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

  const jsPsych = initJsPsych();
  const trialRec = new Rec.TrialRecordExtension(jsPsych);

  const params = {
    max_upload_seconds: null,
  };

  await trialRec.initialize();
  trialRec.on_start(params);
  trialRec.on_load();

  await trialRec.on_finish();

  // recorder.stop should be called with null as the max upload duration
  expect(recStopSpy).toHaveBeenCalledWith({
    upload_timeout_ms: null,
    upload_timeout_message: "Trial recording upload timed out",
  });

  // check the display cleanup
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop with failure during stop", async () => {
  // Create a controlled promise and capture the reject function
  let rejectStop!: (err: unknown) => void;
  const stopPromise = new Promise<string>((_, reject) => {
    rejectStop = reject;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let resolveUpload!: () => void;
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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
  rejectStop(new Error("stop failed"));

  // Wait for plugin's `.catch()` handler to run
  await Promise.resolve();

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "TrialRecordExtension: recorder stop/upload failed.",
    Error("stop failed"),
  );

  // Wait for plugin's `.catch()` handler to run
  await Promise.resolve();

  // TO DO: modify the trial extension code to display translated error msg and/or researcher contact info
  expect(global_display_el.innerHTML).toBe("");
});

test("Trial recording stop with failure during upload", async () => {
  let resolveStop!: (value: string) => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  // Create a controlled promise and capture the reject function
  let rejectUpload!: (err: unknown) => void;
  const uploadPromise = new Promise<string>((_, reject) => {
    rejectUpload = reject;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // Resolve stop
  resolveStop("url");
  // Reject upload
  rejectUpload(new Error("upload failed"));

  // Wait for plugin's `.catch()` handler to run and flush microtasks
  await Promise.resolve();
  await Promise.resolve();

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "TrialRecordExtension: recorder stop/upload failed.",
    Error("upload failed"),
  );

  // TO DO: modify the trial extension code to display translated error msg and/or researcher contact info
  expect(global_display_el.innerHTML).toBe("");
});

test("Start session recording", async () => {
  const mockRecStart = jest.spyOn(Recorder.prototype, "start");
  const jsPsych = initJsPsych();
  const startRec = new Rec.StartRecordPlugin(jsPsych);
  const display_element = jest
    .fn()
    .mockImplementation() as unknown as HTMLElement;
  const trial = {
    locale: "en-us",
  } as unknown as TrialType<PluginInfo>;

  // manual mock
  mockRecStart.mockImplementation(jest.fn().mockReturnValue(Promise.resolve()));

  await startRec.trial(display_element, trial);

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

  mockRecStop.mockImplementation(
    (): StopResult => ({
      stopped: Promise.resolve("mock-url"),
      uploaded: Promise.resolve(),
    }),
  );

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
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // resolve the stop promise and upload promise
  resolveStop("url");
  await stopPromise;
  await Promise.resolve();
  resolveUpload();
  await uploadPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop session recording with different locale should display default uploading msg in specified language", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // resolve the stop promise and upload promise
  resolveStop("url");
  await stopPromise;
  await Promise.resolve();
  resolveUpload();
  await uploadPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop session recording with custom uploading message", async () => {
  // control the recorder stop promise so that we can inspect the display before it resolves
  let resolveStop!: (value: string) => void;
  let resolveUpload!: () => void;
  const stopPromise = new Promise<string>((res) => {
    resolveStop = res;
  });
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  resolveStop("url");
  await stopPromise;
  await Promise.resolve();
  resolveUpload();
  await uploadPromise;
  await Promise.resolve();

  // check the cleanup tasks after the trial method has resolved
  expect(display_element.innerHTML).toBe("");
  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
  expect(window.chs.sessionRecorder).toBeNull();
});

test("Stop session recording with no upload timeout", async () => {
  const mockRecStop = jest.spyOn(Recorder.prototype, "stop");
  const jsPsych = initJsPsych();

  setCHSValue({
    sessionRecorder: new Recorder(jsPsych),
  });

  const stopRec = new Rec.StopRecordPlugin(jsPsych);
  const display_element = jest
    .fn()
    .mockImplementation() as unknown as HTMLElement;

  mockRecStop.mockImplementation(
    (): StopResult => ({
      stopped: Promise.resolve("mock-url"),
      uploaded: Promise.resolve(),
    }),
  );

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

test("Stop recording stop with failure during upload", async () => {
  // Create a controlled promise and capture the reject function
  let rejectStop!: (err: unknown) => void;
  const stopPromise = new Promise<string>((_, reject) => {
    rejectStop = reject;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let resolveUpload!: () => void;
  const uploadPromise = new Promise<void>((res) => {
    resolveUpload = res;
  });

  jest
    .spyOn(Recorder.prototype, "stop")
    .mockReturnValue({ stopped: stopPromise, uploaded: uploadPromise });

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

  // TO DO: modify the plugin code to display translated error msg and/or researcher contact info
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "StopRecordPlugin: recorder stop/upload failed.",
    Error("upload failed"),
  );
});
