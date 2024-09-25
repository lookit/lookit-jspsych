import { initJsPsych } from "jspsych";
import Mustache from "mustache";
import consentVideoTrial from "../templates/consent-video-trial.mustache";
import webcamFeed from "../templates/webcam-feed.mustache";
import { ConsentVideoPlugin } from "./consentVideo";
import {
  ButtonNotFoundError,
  ImageNotFoundError,
  VideoContainerNotFoundError,
} from "./errors";
import Recorder from "./recorder";

jest.mock("./recorder");

test("Instantiate recorder", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);

  expect(plugin["recorder"]).toBeDefined();
});

test("Trial", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  // const display = { insertAdjacentHTML: jest.fn() } as unknown as HTMLElement;
  const display = document.createElement("div");

  plugin["webcamFeed"] = jest.fn();
  plugin["recordButton"] = jest.fn();
  plugin["stopButton"] = jest.fn();
  plugin["playButton"] = jest.fn();
  plugin["nextButton"] = jest.fn();

  plugin.trial(display);

  expect(plugin["webcamFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["recordButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["stopButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["playButton"]).toHaveBeenCalledTimes(1);
  expect(plugin["nextButton"]).toHaveBeenCalledTimes(1);
});

test("GetVideoContainer error when no container", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  expect(() =>
    plugin["getVideoContainer"](document.createElement("div")),
  ).toThrow(VideoContainerNotFoundError);
});

test("GetVideoContainer", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = `<div id="${plugin["video_container_id"]}"></div>`;

  const html = plugin["getVideoContainer"](display).outerHTML;
  expect(html).toBe(`<div id="lookit-jspsych-video-container"></div>`);
});

test("webcamFeed", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = `<div id="${plugin["video_container_id"]}"><img id="record-icon"></div>`;
  plugin["getVideoContainer"] = jest.fn();
  plugin["webcamFeed"](display);

  expect(display.innerHTML).toContain(
    `<img id="record-icon" style="visibility: hidden;">`,
  );
  expect(Recorder.prototype.insertWebcamFeed).toHaveBeenCalledTimes(1);
});

test("playbackFeed", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");
  const vidContainer = "some video container";

  plugin["getVideoContainer"] = jest.fn().mockReturnValue(vidContainer);
  plugin["onEnded"] = jest.fn().mockReturnValue("some func");
  plugin["playbackFeed"](display);

  expect(Recorder.prototype.insertPlaybackFeed).toHaveBeenCalledWith(
    vidContainer,
    "some func",
    "300px",
  );
});

test("onEnded", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");
  const play = document.createElement("button");
  const next = document.createElement("button");

  display.innerHTML = Mustache.render(consentVideoTrial, {});
  plugin["webcamFeed"] = jest.fn();
  plugin["getButton"] = jest.fn().mockImplementation((_display, id) => {
    if (id === "play") {
      return play;
    } else if (id === "next") {
      return next;
    }
    return;
  });

  plugin["onEnded"](display)();

  expect(plugin["webcamFeed"]).toHaveBeenCalledWith(display);
  expect(plugin["webcamFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["getButton"]).toHaveBeenCalledTimes(2);
  expect(play.disabled).toBeFalsy();
  expect(next.disabled).toBeFalsy();
});

test("getButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = Mustache.render(consentVideoTrial, {});

  expect(plugin["getButton"](display, "next").id).toStrictEqual("next");
});

test("getButton error when button not found", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  expect(() => plugin["getButton"](display, "next")).toThrow(
    ButtonNotFoundError,
  );
});

test("getImg error when image not found", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");
  expect(() => plugin["getImg"](display, "record-icon")).toThrow(
    ImageNotFoundError,
  );
});

test("recordButton", async () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML =
    Mustache.render(consentVideoTrial, {}) + Mustache.render(webcamFeed, {});

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
  expect(Recorder.prototype.start).toHaveBeenCalledWith("consent");
});

test("playButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  plugin["playbackFeed"] = jest.fn();

  display.innerHTML = Mustache.render(consentVideoTrial, {});

  plugin["playButton"](display);

  const playButton = display.querySelector<HTMLButtonElement>("button#play");

  playButton!.dispatchEvent(new Event("click"));

  expect(playButton!.disabled).toBeTruthy();
  expect(plugin["playbackFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["playbackFeed"]).toHaveBeenCalledWith(display);
});

test("stopButton", async () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML =
    Mustache.render(consentVideoTrial, {
      video_container_id: plugin["video_container_id"],
    }) + Mustache.render(webcamFeed, {});

  plugin["webcamFeed"] = jest.fn();
  plugin["stopButton"](display);

  const stopButton = display.querySelector<HTMLButtonElement>("button#stop");
  await stopButton!.dispatchEvent(new Event("click"));

  display
    .querySelectorAll<HTMLButtonElement>("button#record, button#play")
    .forEach((button) => expect(button.disabled).toBeFalsy());
  expect(stopButton!.disabled).toBeTruthy();
  expect(Recorder.prototype.stop).toHaveBeenCalledTimes(1);
  expect(Recorder.prototype.reset).toHaveBeenCalledTimes(1);
  expect(plugin["webcamFeed"]).toHaveBeenCalledTimes(1);
  expect(plugin["webcamFeed"]).toHaveBeenCalledWith(display);
});

test("nextButton", () => {
  const jsPsych = initJsPsych();
  const plugin = new ConsentVideoPlugin(jsPsych);
  const display = document.createElement("div");

  display.innerHTML = Mustache.render(consentVideoTrial, {});
  jsPsych.finishTrial = jest.fn();

  plugin["nextButton"](display);
  display
    .querySelector<HTMLButtonElement>("button#next")!
    .dispatchEvent(new Event("click"));

  expect(jsPsych.finishTrial).toHaveBeenCalledTimes(1);
});
