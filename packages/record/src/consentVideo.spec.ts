import Data from "@lookit/data";
import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import Handlebars from "handlebars";
import { initJsPsych, PluginInfo, TrialType } from "jspsych";
import playbackFeed from "../hbs/playback-feed.hbs";
import recordFeed from "../hbs/record-feed.hbs";
import { VideoConsentPlugin } from "./consentVideo";
import { ElementNotFoundError } from "./errors";
import Recorder from "./recorder";

declare const window: LookitWindow;

window.chs = {
  study: {
    attributes: {
      name: "name",
      duration: "duration",
    },
  },
  response: {
    id: "some id",
  },
} as typeof window.chs;

jest.mock("./recorder");
jest.mock("@lookit/data", () => ({
  updateResponse: jest.fn().mockReturnValue("Response"),
}));

test("Instantiate recorder", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  expect(plugin["recorder"]).toBeDefined();
});

test("Trial", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  plugin["recordFeed"] = jest.fn();
  plugin["recordButton"] = jest.fn();
  plugin["stopButton"] = jest.fn();
  plugin["playButton"] = jest.fn();
  plugin["nextButton"] = jest.fn();

  plugin.trial(display, trial);

  expect(plugin["recordFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["recordButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["stopButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["playButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["nextButton"]).toHaveBeenCalledTimes(1);
});

test("GetVideoContainer error when no container", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  expect(() =>
    plugin["getVideoContainer"](document.createElement("div")),
  ).toThrow(ElementNotFoundError);
  expect(() =>
    plugin["getVideoContainer"](document.createElement("div")),
  ).toThrow(`"${plugin["video_container_id"]}" div not found.`);
});

test("getMessageContainer error when no container", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  expect(() =>
    plugin["getMessageContainer"](document.createElement("div")),
  ).toThrow(ElementNotFoundError);
  expect(() =>
    plugin["getMessageContainer"](document.createElement("div")),
  ).toThrow(`"${plugin["msg_container_id"]}" div not found.`);
});

test("GetVideoContainer", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = `<div id="${plugin["video_container_id"]}"></div>`;

  const html = plugin["getVideoContainer"](display).outerHTML;
  expect(html).toBe(`<div id="lookit-jspsych-video-container"></div>`);
});

test("getMessageContainer", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = `<div id="${plugin["msg_container_id"]}"></div>`;

  const html = plugin["getMessageContainer"](display).outerHTML;
  expect(html).toBe(`<div id="lookit-jspsych-video-msg-container"></div>`);
});

test("recordFeed", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = `<div id="${plugin["video_container_id"]}"><img id="record-icon"></div>`;
  plugin["getVideoContainer"] = jest.fn();
  plugin["recordFeed"](display);

  expect(display.innerHTML).toContain(
    `<img id="record-icon" style="visibility: hidden;">`,
  );
  expect(Recorder.prototype.insertRecordFeed).toHaveBeenCalledTimes(1);
});

test("playbackFeed", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const vidContainer = "some video container";

  plugin["getVideoContainer"] = jest.fn().mockReturnValue(vidContainer);
  plugin["onPlaybackEnded"] = jest.fn().mockReturnValue("some func");
  plugin["playbackFeed"](display);

  expect(Recorder.prototype.insertPlaybackFeed).toHaveBeenCalledWith(
    vidContainer,
    "some func",
  );
});

test("onPlaybackEnded", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const play = document.createElement("button");
  const next = document.createElement("button");
  const record = document.createElement("button");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  display.innerHTML = chsTemplates.consentVideo(trial);
  plugin["recordFeed"] = jest.fn();
  plugin["getButton"] = jest.fn().mockImplementation((_display, id) => {
    switch (id) {
      case "play":
        return play;
      case "next":
        return next;
      case "record":
        return record;
    }

    if (id === "play") {
      return play;
    } else if (id === "next") {
      return next;
    }

    return "";
  });

  plugin["onPlaybackEnded"](display)();

  expect(plugin["recordFeed"]).toHaveBeenCalledWith(display);
  expect(plugin["recordFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["getButton"]).toHaveBeenCalledTimes(3);
  expect(play.disabled).toBeFalsy();
  expect(next.disabled).toBeFalsy();
});

test("getButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  display.innerHTML = chsTemplates.consentVideo(trial);

  expect(plugin["getButton"](display, "next").id).toStrictEqual("next");
});

test("getButton error when button not found", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");

  expect(() => plugin["getButton"](display, "next")).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getButton"](display, "next")).toThrow(
    `"next" button not found.`,
  );
});

test("getImg error when image not found", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  expect(() => plugin["getImg"](display, "record-icon")).toThrow(
    ElementNotFoundError,
  );
  expect(() => plugin["getImg"](display, "record-icon")).toThrow(
    `"record-icon" img not found.`,
  );
});

test("recordButton", async () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  display.innerHTML = chsTemplates.consentVideo(trial);

  display.innerHTML =
    chsTemplates.consentVideo(trial) + Handlebars.compile(recordFeed)({});

  plugin["recordButton"](display);

  // Trigger event
  const click = new Event("click");
  await display
    .querySelector<HTMLButtonElement>("button#record")!
    .dispatchEvent(click);

  // Check for query length
  const disabledButtons = display.querySelectorAll<HTMLButtonElement>(
    "button#record, button#play, button#next",
  );
  expect(disabledButtons.length).toStrictEqual(3);

  // Check for buttons to be disabled.
  disabledButtons.forEach((button) => {
    expect(button.disabled).toBeTruthy();
  });

  // Stop button should not be disabled.
  expect(
    display.querySelector<HTMLButtonElement>("button#stop")!.disabled,
  ).toBeFalsy();

  // Show record record icon
  expect(
    display.querySelector<HTMLImageElement>("img#record-icon")!.style
      .visibility,
  ).toStrictEqual("visible");

  // Start recorder
  expect(Recorder.prototype.start).toHaveBeenCalledTimes(1);
  expect(Recorder.prototype.start).toHaveBeenCalledWith(true, "consent-video");
});

test("playButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  plugin["playbackFeed"] = jest.fn();

  display.innerHTML = chsTemplates.consentVideo(trial);

  plugin["playButton"](display);

  const playButton = display.querySelector<HTMLButtonElement>("button#play");

  playButton!.dispatchEvent(new Event("click"));

  expect(playButton!.disabled).toBeTruthy();
  expect(plugin["playbackFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["playbackFeed"]).toHaveBeenCalledWith(display);
});

test("stopButton", async () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  display.innerHTML =
    chsTemplates.consentVideo(trial) + Handlebars.compile(recordFeed)({});

  plugin["recordFeed"] = jest.fn();
  plugin["stopButton"](display);

  const stopButton = display.querySelector<HTMLButtonElement>("button#stop");
  await stopButton!.dispatchEvent(new Event("click"));

  display
    .querySelectorAll<HTMLButtonElement>("button#record, button#play")
    .forEach((button) => expect(button.disabled).toBeFalsy());
  expect(stopButton!.disabled).toBeTruthy();
  expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);
  expect(Recorder.prototype.reset).toHaveBeenCalledTimes(1);
  expect(plugin["recordFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["recordFeed"]).toHaveBeenCalledWith(display);
});

test("nextButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);
  const display = document.createElement("div");
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;

  display.innerHTML = chsTemplates.consentVideo(trial);
  plugin["endTrial"] = jest.fn();

  plugin["nextButton"](display);
  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(plugin["endTrial"]).toHaveBeenCalledTimes(1);
});

test("endTrial", () => {
  const jsPsych = initJsPsych();
  const plugin = new VideoConsentPlugin(jsPsych);

  plugin["endTrial"]();

  expect(Data.updateResponse).toHaveBeenCalledWith(window.chs.response.id, {
    completed_consent_frame: true,
  });
});

test("Does video consent plugin return chsData correctly?", () => {
  expect(VideoConsentPlugin.chsData()).toMatchObject({ chs_type: "consent" });
});

test("Video playback should not be muted", () => {
  expect(playbackFeed).not.toContain("muted");
});
