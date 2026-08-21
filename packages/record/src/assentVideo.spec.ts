import { LookitWindow } from "@lookit/data/dist/types";
import { initJsPsych, JsPsych, PluginInfo, TrialType } from "jspsych";
import { VideoAssentPlugin } from "./assentVideo";
import { ElementNotFoundError } from "./errors";
import Recorder from "./recorder";
import { StopOptions, StopResult } from "./types";

declare const window: LookitWindow;

window.chs = {
  child: {
    attributes: {
      birthday: null,
    },
  },
} as unknown as typeof window.chs;

jest.mock("./recorder");

type AssentTrial = {
  locale?: string | undefined;
  pages: Array<{ stimulus: string; show_webcam: boolean }>;
  min_age_to_assent?: number | undefined;
  participation_question?: string | undefined;
  next_button?: string | undefined;
  previous_button?: string | undefined;
  yes_button?: string | undefined;
  no_button?: string | undefined;
  continue_button?: string | undefined;
  record_whole_procedure?: boolean | undefined;
  record_last_page?: boolean | undefined;
};

// Multiple pages and parameter defaults, but we need to define some of the
// defaults here because we're calling plugin.trial() directly and bypassing jsPsych.run([trial]),
// so parameter defaults are not set automatically.
const defaultTrial: AssentTrial = {
  locale: "en-us",
  pages: [
    { stimulus: "<p>Page 1</p>", show_webcam: false },
    { stimulus: "<p>Page 2</p>", show_webcam: false },
    { stimulus: "<p>Page 3</p>", show_webcam: false },
  ],
};

/**
 * Helper function to initialize jsPsych and create the finishTrial spy/mock.
 *
 * @returns JsPsych instance
 */
const makeJsPsych = (): JsPsych => {
  const jsPsych = initJsPsych();
  jest.spyOn(jsPsych, "finishTrial").mockImplementation(() => {});
  return jsPsych;
};

/**
 * Helper function to initialize jsPsych, plugin, and display, and render trial.
 *
 * @param overrides - Assent trial object with parameters to override the
 *   default trial.
 * @returns Object with: jsPsych instance, plugin instance, display, and trial
 *   object.
 */
const renderTrial = (overrides: Partial<AssentTrial> = {}) => {
  const jsPsych = makeJsPsych();
  const plugin = new VideoAssentPlugin(jsPsych);
  const display = document.createElement("div");
  document.body.appendChild(display);
  const trial = {
    ...defaultTrial,
    ...overrides,
  } as unknown as TrialType<PluginInfo>;
  plugin.trial(display, trial);
  return { jsPsych, plugin, display, trial };
};

beforeEach(() => {
  jest.clearAllMocks();
  (window.chs.child.attributes as { birthday: string | null }).birthday = null;
  (Recorder.prototype.start as jest.Mock).mockResolvedValue(undefined);
  (
    Recorder.prototype.stop as jest.Mock<StopResult, [StopOptions?]>
  ).mockReturnValue({
    stopped: Promise.resolve("mock-url"),
    uploaded: Promise.resolve(),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

// Static / info

test("chsData returns chs_type: assent", () => {
  expect(VideoAssentPlugin.chsData()).toMatchObject({ chs_type: "assent" });
});

test("Plugin info has correct name", () => {
  expect(VideoAssentPlugin.info.name).toBe("assent-video");
});

test("Plugin info has expected parameters", () => {
  const params = VideoAssentPlugin.info.parameters;
  expect(params).toHaveProperty("min_age_to_assent");
  expect(params).toHaveProperty("participation_question");
  expect(params).toHaveProperty("record_whole_procedure");
  expect(params).toHaveProperty("record_last_page");
  expect(params).toHaveProperty("next_button");
  expect(params).toHaveProperty("previous_button");
  expect(params).toHaveProperty("pages");
});

test("pages parameter is an array with nested stimulus and show_webcam", () => {
  const pages = VideoAssentPlugin.info.parameters.pages;
  expect(pages.array).toBe(true);
  expect(pages.nested).toHaveProperty("stimulus");
  expect(pages.nested).toHaveProperty("show_webcam");
});

// Instantiation

test("Instantiate plugin creates recorder", () => {
  const jsPsych = makeJsPsych();
  const plugin = new VideoAssentPlugin(jsPsych);
  expect(plugin).toBeDefined();
  expect(plugin["recorder"]).toBeDefined();
});

test("Constructor sets childAge from birthday", () => {
  (window.chs.child.attributes as { birthday: string | null }).birthday =
    "2020-01-01";
  const plugin = new VideoAssentPlugin(makeJsPsych());
  expect(plugin["childAge"]).not.toBeNull();
  expect(typeof plugin["childAge"]).toBe("number");
});

test("Constructor sets childAge to null when no birthday", () => {
  (window.chs.child.attributes as { birthday: string | null }).birthday = null;
  const plugin = new VideoAssentPlugin(makeJsPsych());
  expect(plugin["childAge"]).toBeNull();
});

// Age check / skip logic

test("Trial skips when child is younger than min_age_to_assent", () => {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  (window.chs.child.attributes as { birthday: string | null }).birthday =
    fiveYearsAgo.toISOString().split("T")[0];

  const jsPsych = makeJsPsych();
  const plugin = new VideoAssentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    ...defaultTrial,
    min_age_to_assent: 7,
  } as unknown as TrialType<PluginInfo>;

  plugin.trial(display, trial);

  expect(jsPsych.finishTrial).toHaveBeenCalledWith(
    expect.objectContaining({ skipped: true, response: null }),
  );
  expect(display.innerHTML).toBe("");
});

test("Trial does not skip when child meets min_age_to_assent", () => {
  const sevenYearsAgo = new Date();
  sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
  (window.chs.child.attributes as { birthday: string | null }).birthday =
    sevenYearsAgo.toISOString().split("T")[0];

  const jsPsych = makeJsPsych();
  const plugin = new VideoAssentPlugin(jsPsych);
  const display = document.createElement("div");
  document.body.appendChild(display);
  const trial = {
    ...defaultTrial,
    min_age_to_assent: 7,
  } as unknown as TrialType<PluginInfo>;

  plugin.trial(display, trial);

  expect(jsPsych.finishTrial).not.toHaveBeenCalledWith(
    expect.objectContaining({ skipped: true }),
  );
  expect(display.innerHTML).not.toBe("");
});

test("Trial does not skip when min_age_to_assent is 0 (default)", () => {
  const jsPsych = makeJsPsych();
  const { display } = renderTrial({ min_age_to_assent: 0 });
  expect(jsPsych.finishTrial).not.toHaveBeenCalled();
  expect(display.innerHTML).not.toBe("");
});

test("Trial proceeds when childAge is null even with high min_age_to_assent", () => {
  const jsPsych = makeJsPsych();
  const plugin = new VideoAssentPlugin(jsPsych);
  const display = document.createElement("div");
  document.body.appendChild(display);
  const trial = {
    ...defaultTrial,
    min_age_to_assent: 99,
  } as unknown as TrialType<PluginInfo>;

  plugin.trial(display, trial);

  expect(jsPsych.finishTrial).not.toHaveBeenCalledWith(
    expect.objectContaining({ skipped: true }),
  );
  expect(display.innerHTML).not.toBe("");
});

// Trial rendering / initial state

test("Trial renders expected container elements", () => {
  const { display } = renderTrial();
  expect(display.querySelector("#lookit-jspsych-video-container")).toBeTruthy();
  expect(
    display.querySelector("#lookit-jspsych-video-msg-container"),
  ).toBeTruthy();
  expect(
    display.querySelector("#lookit-jspsych-assent-page-container"),
  ).toBeTruthy();
  expect(
    display.querySelector("#lookit-jspsych-assent-resp-btn-container"),
  ).toBeTruthy();
  expect(
    display.querySelector("#lookit-jspsych-assent-pages-nav-container"),
  ).toBeTruthy();
});

test("Trial renders first page stimulus content", () => {
  const { display } = renderTrial();
  const pageContainer = display.querySelector(
    "#lookit-jspsych-assent-page-container",
  );
  expect(pageContainer!.innerHTML).toContain("Page 1");
});

test("Default button labels are used if not set", () => {
  const { display } = renderTrial({
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
    // omit button label parameters so that defaults are used
  });
  expect(display.querySelector("button#yes")!.textContent).toContain("Yes");
  expect(display.querySelector("button#no")!.textContent).toContain("No");
  expect(display.querySelector("button#next")!.textContent).toContain("Next");
  expect(display.querySelector("button#previous")!.textContent).toContain(
    "Previous",
  );
  expect(display.querySelector("button#done")!.textContent).toContain(
    "Continue",
  );
});

test("Default button labels are translated according to locale", () => {
  const { display } = renderTrial({
    locale: "fr",
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
    // omit button label parameters so they fall back to translated defaults
  });
  expect(display.querySelector("button#yes")!.textContent).toContain("Oui"); // Yes
  expect(display.querySelector("button#no")!.textContent).toContain("Non"); // No
  expect(display.querySelector("button#next")!.textContent).toContain(
    "Prochain",
  ); // Next
  expect(display.querySelector("button#previous")!.textContent).toContain(
    "Précédent",
  ); // Previous
  expect(display.querySelector("button#done")!.textContent).toContain(
    "Continuer",
  ); // Continue
});

test("User-defined labels will override defaults in default locale", () => {
  const { display } = renderTrial({
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
    // custom button yes, next label parameters
    next_button: ">>",
    previous_button: "<<",
  });
  expect(display.querySelector("button#yes")!.textContent).toContain("Yes");
  expect(display.querySelector("button#no")!.textContent).toContain("No");
  expect(display.querySelector("button#next")!.textContent).toContain(">>");
  expect(display.querySelector("button#previous")!.textContent).toContain("<<");
  expect(display.querySelector("button#done")!.textContent).toContain(
    "Continue",
  );
});

test("User-defined labels will override defaults in default French", () => {
  const { display } = renderTrial({
    locale: "fr",
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
    // custom button no, previous, continue label parameters
    no_button: "Nah",
    continue_button: "Done",
    previous_button: "Back",
  });
  expect(display.querySelector("button#yes")!.textContent).toContain("Oui"); // Yes
  expect(display.querySelector("button#no")!.textContent).toContain("Nah"); // Custom
  expect(display.querySelector("button#next")!.textContent).toContain(
    "Prochain",
  ); // Next
  expect(display.querySelector("button#previous")!.textContent).toContain(
    "Back",
  ); // Custom
  expect(display.querySelector("button#done")!.textContent).toContain("Done"); // Custom
});

test("Multi-page trial: yes/no disabled, next enabled, previous disabled on load", () => {
  const { display } = renderTrial();
  expect(
    display.querySelector<HTMLButtonElement>("button#next")!.disabled,
  ).toBe(false);
  expect(
    display.querySelector<HTMLButtonElement>("button#previous")!.disabled,
  ).toBe(true);
  expect(display.querySelector<HTMLButtonElement>("button#yes")!.disabled).toBe(
    true,
  );
  expect(display.querySelector<HTMLButtonElement>("button#no")!.disabled).toBe(
    true,
  );
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(true);
});

test("Single-page trial: no next/prev buttons and yes/no enabled on load", () => {
  const { display } = renderTrial({
    pages: [{ stimulus: "<p>Only page</p>", show_webcam: false }],
  });
  expect(display.querySelector("button#next")).toBeNull();
  expect(display.querySelector("button#previous")).toBeNull();
  expect(display.querySelector<HTMLButtonElement>("button#yes")!.disabled).toBe(
    false,
  );
  expect(display.querySelector<HTMLButtonElement>("button#no")!.disabled).toBe(
    false,
  );
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(true);
});

// Page navigation

test("Next button advances to next page and updates content", () => {
  const { display } = renderTrial();
  const pageContainer = display.querySelector(
    "#lookit-jspsych-assent-page-container",
  )!;
  expect(pageContainer.innerHTML).toContain("Page 1");

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(pageContainer.innerHTML).toContain("Page 2");
});

test("Next button enables previous button", () => {
  const { display } = renderTrial();
  expect(
    display.querySelector<HTMLButtonElement>("button#previous")!.disabled,
  ).toBe(true);

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(
    display.querySelector<HTMLButtonElement>("button#previous")!.disabled,
  ).toBe(false);
});

test("Next button on last page disables next and enables yes/no", () => {
  const { display } = renderTrial({
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(
    display.querySelector<HTMLButtonElement>("button#next")!.disabled,
  ).toBe(true);
  expect(display.querySelector<HTMLButtonElement>("button#yes")!.disabled).toBe(
    false,
  );
  expect(display.querySelector<HTMLButtonElement>("button#no")!.disabled).toBe(
    false,
  );
});

test("Previous button decrements page and updates content", () => {
  const { display } = renderTrial();
  const pageContainer = display.querySelector(
    "#lookit-jspsych-assent-page-container",
  )!;

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));
  expect(pageContainer.innerHTML).toContain("Page 2");

  display
    .querySelector<HTMLButtonElement>("button#previous")!
    .dispatchEvent(new Event("click"));
  expect(pageContainer.innerHTML).toContain("Page 1");
});

test("Previous button re-enables next when leaving last page", () => {
  const { display } = renderTrial({
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));
  expect(
    display.querySelector<HTMLButtonElement>("button#next")!.disabled,
  ).toBe(true);

  display
    .querySelector<HTMLButtonElement>("button#previous")!
    .dispatchEvent(new Event("click"));
  expect(
    display.querySelector<HTMLButtonElement>("button#next")!.disabled,
  ).toBe(false);
});

test("Previous button disables itself when back at first page", () => {
  const { display } = renderTrial();

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));
  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));
  expect(
    display.querySelector<HTMLButtonElement>("button#previous")!.disabled,
  ).toBe(false);

  display
    .querySelector<HTMLButtonElement>("button#previous")!
    .dispatchEvent(new Event("click"));
  display
    .querySelector<HTMLButtonElement>("button#previous")!
    .dispatchEvent(new Event("click"));
  expect(
    display.querySelector<HTMLButtonElement>("button#previous")!.disabled,
  ).toBe(true);
});

test("Previous button from last page keeps yes, no, and done enabled", () => {
  const { display } = renderTrial({
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));
  display
    .querySelector<HTMLButtonElement>("button#yes")!
    .dispatchEvent(new Event("click"));
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(false);

  display
    .querySelector<HTMLButtonElement>("button#previous")!
    .dispatchEvent(new Event("click"));

  expect(display.querySelector<HTMLButtonElement>("button#yes")!.disabled).toBe(
    false,
  );
  expect(display.querySelector<HTMLButtonElement>("button#no")!.disabled).toBe(
    false,
  );
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(false);
});

// Yes / No buttons and response state

test("Yes button sets response to true and enables done", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  expect(plugin["response"]).toBeNull();
  display
    .querySelector<HTMLButtonElement>("button#yes")!
    .dispatchEvent(new Event("click"));

  expect(plugin["response"]).toBe(true);
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(false);
});

test("No button sets response to false and enables done", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  const yesBtn = display.querySelector<HTMLButtonElement>("button#yes")!;
  const noBtn = display.querySelector<HTMLButtonElement>("button#no")!;

  noBtn.dispatchEvent(new Event("click"));

  expect(plugin["response"]).toBe(false);

  expect(yesBtn.classList.contains("not-selected")).toBe(true);
  expect(noBtn.classList.contains("not-selected")).toBe(false);
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(false);
});

test("Yes click removes not-selected from yes and adds to no", () => {
  const { display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  const yesBtn = display.querySelector<HTMLButtonElement>("button#yes")!;
  const noBtn = display.querySelector<HTMLButtonElement>("button#no")!;

  yesBtn.dispatchEvent(new Event("click"));

  expect(yesBtn.classList.contains("not-selected")).toBe(false);
  expect(noBtn.classList.contains("not-selected")).toBe(true);
});

test("No click removes not-selected from no and adds to yes", () => {
  const { display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  const yesBtn = display.querySelector<HTMLButtonElement>("button#yes")!;
  const noBtn = display.querySelector<HTMLButtonElement>("button#no")!;

  noBtn.dispatchEvent(new Event("click"));

  expect(noBtn.classList.contains("not-selected")).toBe(false);
  expect(yesBtn.classList.contains("not-selected")).toBe(true);
});

test("Response can be switched from yes to no", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  const yesBtn = display.querySelector<HTMLButtonElement>("button#yes")!;
  const noBtn = display.querySelector<HTMLButtonElement>("button#no")!;

  yesBtn.dispatchEvent(new Event("click"));
  expect(plugin["response"]).toBe(true);

  noBtn.dispatchEvent(new Event("click"));
  expect(plugin["response"]).toBe(false);
  expect(noBtn.classList.contains("not-selected")).toBe(false);
  expect(yesBtn.classList.contains("not-selected")).toBe(true);
});

test("Response can be switched from no to yes", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  const yesBtn = display.querySelector<HTMLButtonElement>("button#yes")!;
  const noBtn = display.querySelector<HTMLButtonElement>("button#no")!;

  noBtn.dispatchEvent(new Event("click"));
  expect(plugin["response"]).toBe(false);

  yesBtn.dispatchEvent(new Event("click"));
  expect(plugin["response"]).toBe(true);
  expect(yesBtn.classList.contains("not-selected")).toBe(false);
  expect(noBtn.classList.contains("not-selected")).toBe(true);
});

// Done button / endTrial

test("Done button click calls endTrial with display", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  plugin["endTrial"] = jest.fn();

  display
    .querySelector<HTMLButtonElement>("button#yes")!
    .dispatchEvent(new Event("click"));
  display
    .querySelector<HTMLButtonElement>("button#done")!
    .dispatchEvent(new Event("click"));

  expect(plugin["endTrial"]).toHaveBeenCalledTimes(1);
  expect(plugin["endTrial"]).toHaveBeenCalledWith(display);
});

test("endTrial without recording calls finishTrial with response and child_age_years", async () => {
  const { jsPsych, plugin, display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  plugin["response"] = true;
  await plugin["endTrial"](display);

  expect(Recorder.prototype.stop).not.toHaveBeenCalled();
  expect(jsPsych.finishTrial).toHaveBeenCalledWith({
    response: true,
    child_age_years: null,
  });
});

test("endTrial with recording awaits stop before calling finishTrial", async () => {
  const { jsPsych, plugin, display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  plugin["response"] = false;
  plugin["startPromise"] = Promise.resolve();

  await plugin["endTrial"](display);

  expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);
  expect(jsPsych.finishTrial).toHaveBeenCalledWith({
    response: false,
    child_age_years: null,
  });
  // finishTrial must be called after stop, not before
  const stopOrder = (Recorder.prototype.stop as jest.Mock).mock
    .invocationCallOrder[0];
  const finishOrder = (jsPsych.finishTrial as jest.Mock).mock
    .invocationCallOrder[0];
  expect(stopOrder).toBeLessThan(finishOrder);
});

test("endTrial with recording attaches chs_recording captured before stop", async () => {
  // Clear call history so the invocationCallOrder comparison below reflects only
  // this test's calls (mocks are not auto-cleared between tests).
  (Recorder.prototype.stop as jest.Mock).mockClear();
  (Recorder.prototype.getChsRecordingData as jest.Mock).mockClear();
  const { jsPsych, plugin, display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  const recordingData = {
    filename: "assent.webm",
    is_session_recording: false,
    stream_time: null,
    method: "camera",
    is_consent: false,
    start_time_source: "event",
  };
  (Recorder.prototype.getChsRecordingData as jest.Mock).mockReturnValueOnce(
    recordingData,
  );

  plugin["response"] = true;
  plugin["startPromise"] = Promise.resolve();

  await plugin["endTrial"](display);

  // Captured as a non-session recording with no trial-start stream time...
  expect(Recorder.prototype.getChsRecordingData).toHaveBeenCalledWith(
    false,
    null,
  );
  // ...and before stop(), which resets the recorder.
  const captureOrder = (Recorder.prototype.getChsRecordingData as jest.Mock)
    .mock.invocationCallOrder[0];
  const stopOrder = (Recorder.prototype.stop as jest.Mock).mock
    .invocationCallOrder[0];
  expect(captureOrder).toBeLessThan(stopOrder);
  expect(jsPsych.finishTrial).toHaveBeenCalledWith({
    response: true,
    child_age_years: null,
    chs_recording: recordingData,
  });
});

test("endTrial without recording does not capture or attach chs_recording", async () => {
  // Clear call history so not.toHaveBeenCalled() reflects only this test (mocks
  // are not auto-cleared between tests).
  (Recorder.prototype.getChsRecordingData as jest.Mock).mockClear();
  const { jsPsych, plugin, display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  // No startPromise: the trial never recorded.
  plugin["response"] = true;
  await plugin["endTrial"](display);

  expect(Recorder.prototype.getChsRecordingData).not.toHaveBeenCalled();
  expect(jsPsych.finishTrial).toHaveBeenCalledWith({
    response: true,
    child_age_years: null,
  });
});

test("endTrial disables done button while recording is stopping", async () => {
  let resolveStopped!: (value: string) => void;
  const stoppedPromise = new Promise<string>((resolve) => {
    resolveStopped = resolve;
  });
  (
    Recorder.prototype.stop as jest.Mock<StopResult, [StopOptions?]>
  ).mockReturnValue({
    stopped: stoppedPromise,
    uploaded: Promise.resolve(),
  });

  const { plugin, display } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  plugin["startPromise"] = Promise.resolve();
  plugin["response"] = true;
  plugin["setBtnDisabled"](display, "done", false);

  const endTrialPromise = plugin["endTrial"](display);
  // Done should be disabled during the stop/upload wait
  expect(
    display.querySelector<HTMLButtonElement>("button#done")!.disabled,
  ).toBe(true);

  resolveStopped("url");
  await endTrialPromise;
});

// Recording: startRecording

test("startRecording sets startPromise", () => {
  const { plugin, display } = renderTrial();

  expect(plugin["startPromise"]).toBeNull();
  plugin["startRecording"](display);
  expect(plugin["startPromise"]).not.toBeNull();
});

test("startRecording calls recorder.start with consent=false and plugin name", async () => {
  const { plugin, display } = renderTrial();

  plugin["startRecording"](display);
  await plugin["startPromise"];

  expect(Recorder.prototype.start).toHaveBeenCalledWith(false, "assent-video");
});

test("startRecording sets recordingActive after start resolves", async () => {
  const { plugin, display } = renderTrial();

  expect(plugin["recordingActive"]).toBe(false);
  plugin["startRecording"](display);
  await plugin["startPromise"];
  expect(plugin["recordingActive"]).toBe(true);
});

// Recording: record_whole_procedure

test("record_whole_procedure starts recording immediately during trial()", () => {
  const { plugin } = renderTrial({ record_whole_procedure: true });

  expect(plugin["startPromise"]).not.toBeNull();
  expect(Recorder.prototype.start).toHaveBeenCalledWith(false, "assent-video");
});

test("record_whole_procedure does not start recording when false", () => {
  const { plugin } = renderTrial({ record_whole_procedure: false });

  expect(plugin["startPromise"]).toBeNull();
  expect(Recorder.prototype.start).not.toHaveBeenCalled();
});

// Recording: record_last_page

test("record_last_page starts recording when reaching last page on multi-page trial", () => {
  const { display, plugin } = renderTrial({
    record_last_page: true,
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  expect(plugin["startPromise"]).toBeNull();
  expect(Recorder.prototype.start).not.toHaveBeenCalled();

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(plugin["startPromise"]).not.toBeNull();
  expect(Recorder.prototype.start).toHaveBeenCalledWith(false, "assent-video");
});

test("record_last_page does not start recording on intermediate pages", () => {
  const { display, plugin } = renderTrial({
    record_last_page: true,
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
      { stimulus: "<p>Page 3</p>", show_webcam: false },
    ],
  });

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(plugin["startPromise"]).toBeNull();
  expect(Recorder.prototype.start).not.toHaveBeenCalled();
});

test("record_last_page starts recording immediately for single-page trial", () => {
  const { plugin } = renderTrial({
    record_last_page: true,
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });

  expect(plugin["startPromise"]).not.toBeNull();
  expect(Recorder.prototype.start).toHaveBeenCalledWith(false, "assent-video");
});

test("record_last_page does not start recording again if record_whole_procedure already started it", () => {
  const { display } = renderTrial({
    record_whole_procedure: true,
    record_last_page: true,
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  expect(Recorder.prototype.start).toHaveBeenCalledTimes(1);

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(Recorder.prototype.start).toHaveBeenCalledTimes(1);
});

test("No recording started when neither record flag is set", () => {
  const { display, plugin } = renderTrial({
    record_whole_procedure: false,
    record_last_page: false,
    pages: [
      { stimulus: "<p>Page 1</p>", show_webcam: false },
      { stimulus: "<p>Page 2</p>", show_webcam: false },
    ],
  });

  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(plugin["startPromise"]).toBeNull();
  expect(Recorder.prototype.start).not.toHaveBeenCalled();
});

// Error handling

test("getNoRespMsgContainer throws ElementNotFoundError when container not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");
  expect(() => plugin["getNoRespMsgContainer"](display)).toThrow(
    ElementNotFoundError,
  );
});

test("getButton throws ElementNotFoundError when button not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");

  expect(() => plugin["getButton"](display, "yes")).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getButton"](display, "yes")).toThrow(
    `"yes" button not found.`,
  );
});

test("getMsgContainer throws ElementNotFoundError when message container not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");

  expect(() => plugin["getMessageContainer"](display)).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getMessageContainer"](display)).toThrow(
    `"${plugin["msg_container_id"]}" div not found.`,
  );
});

test("getVideoContainer throws ElementNotFoundError when container not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");

  expect(() => plugin["getVideoContainer"](display)).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getVideoContainer"](display)).toThrow(
    `"${plugin["video_container_id"]}" div not found.`,
  );
});

test("getPageContainer throws ElementNotFoundError when container not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");

  expect(() => plugin["getPageContainer"](display)).toThrow(
    ElementNotFoundError,
  );
});

test("getImg returns img element when present", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");
  display.innerHTML = `<img id="record-icon">`;

  const img = plugin["getImg"](display, "record-icon");

  expect(img).toBeInstanceOf(HTMLImageElement);
  expect(img.id).toBe("record-icon");
});

test("getImg throws ElementNotFoundError when image not found", () => {
  const plugin = new VideoAssentPlugin(makeJsPsych());
  const display = document.createElement("div");

  expect(() => plugin["getImg"](display, "record-icon")).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getImg"](display, "record-icon")).toThrow(
    `"record-icon" img not found.`,
  );
});

test("displayCurrentPage shows record icon when recording is active and show_webcam is true", () => {
  const { plugin, display } = renderTrial();

  // insertRecordFeed is mocked (no-op), so manually seed the img in the video container
  const videoContainer = display.querySelector<HTMLDivElement>(
    `#${plugin["video_container_id"]}`,
  );
  videoContainer!.innerHTML = `<img id="record-icon" style="visibility:hidden;">`;

  plugin["recordingActive"] = true;

  const trial = {
    ...defaultTrial,
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: true }],
  } as unknown as TrialType<PluginInfo>;
  plugin["displayCurrentPage"](display, trial);

  expect(
    display.querySelector<HTMLImageElement>("img#record-icon")!.style
      .visibility,
  ).toBe("visible");
});

// no_response_message show/hide

test("No-response message is hidden initially", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  const msgDiv = display.querySelector<HTMLDivElement>(
    `#${plugin["no_resp_msg_container_id"]}`,
  )!;
  expect(msgDiv.style.visibility).toBe("hidden");
});

test("No button click shows the no-response message", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  display
    .querySelector<HTMLButtonElement>("button#no")!
    .dispatchEvent(new Event("click"));
  const msgDiv = display.querySelector<HTMLDivElement>(
    `#${plugin["no_resp_msg_container_id"]}`,
  )!;
  expect(msgDiv.style.visibility).toBe("visible");
});

test("Yes button click hides the no-response message", () => {
  const { display, plugin } = renderTrial({
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: false }],
  });
  // show it first
  display
    .querySelector<HTMLButtonElement>("button#no")!
    .dispatchEvent(new Event("click"));
  // then hide it
  display
    .querySelector<HTMLButtonElement>("button#yes")!
    .dispatchEvent(new Event("click"));
  const msgDiv = display.querySelector<HTMLDivElement>(
    `#${plugin["no_resp_msg_container_id"]}`,
  )!;
  expect(msgDiv.style.visibility).toBe("hidden");
});

test("displayCurrentPage does not show record icon when recording is not active", () => {
  const { plugin, display } = renderTrial();

  const videoContainer = display.querySelector<HTMLDivElement>(
    `#${plugin["video_container_id"]}`,
  );
  videoContainer!.innerHTML = `<img id="record-icon" style="visibility:hidden;">`;

  plugin["recordingActive"] = false;

  const trial = {
    ...defaultTrial,
    pages: [{ stimulus: "<p>Page 1</p>", show_webcam: true }],
  } as unknown as TrialType<PluginInfo>;
  plugin["displayCurrentPage"](display, trial);

  // recordFeed hides it; the recordingActive branch is skipped, so it stays hidden
  expect(
    display.querySelector<HTMLImageElement>("img#record-icon")!.style
      .visibility,
  ).toBe("hidden");
});
