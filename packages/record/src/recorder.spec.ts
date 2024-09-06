import Data from "@lookit/data";
import { initJsPsych } from "jspsych";
import { NoStopPromiseError, RecorderInitializeError } from "./error";
import Recorder from "./recorder";
import Mustache from "mustache";
import webcamFeed from "./templates/webcam-feed.mustache";
import { CSSWidthHeight } from "./types";

jest.mock("@lookit/data");

afterEach(() => {
  jest.clearAllMocks();
});

test("Recorder filename", () => {
  const prefix = "prefix";
  const rec = new Recorder(initJsPsych(), prefix);
  expect(rec.filename).toContain(prefix);
});

test("Recorder start", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = { addEventListener: jest.fn(), start: jest.fn() };

  // manual mock
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  await rec.start();

  expect(media.addEventListener).toHaveBeenCalledTimes(2);
  expect(media.start).toHaveBeenCalledTimes(1);
});

test("Recorder stop", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const stopPromise = Promise.resolve();
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };

  // manual mocks
  rec["stopPromise"] = stopPromise;
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // check that the "stop promise" is returned on stop
  expect(rec.stop()).toStrictEqual(stopPromise);

  await rec.stop();

  expect(media.stop).toHaveBeenCalledTimes(2);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(2);
});

test("Recorder no stop promise", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([]) },
  };

  // no stop promise
  rec["stopPromise"] = undefined;

  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  expect(async () => await rec.stop()).rejects.toThrow(NoStopPromiseError);
});

test("Recorder initialize error", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  // no recorder
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(undefined);
  jsPsych.pluginAPI.getMicrophoneRecorder = jest
    .fn()
    .mockReturnValue(undefined);

  expect(async () => await rec.start()).rejects.toThrow(
    RecorderInitializeError,
  );
});

test("Recorder handleStop", async () => {
  const rec = new Recorder(initJsPsych(), "prefix");
  const download = jest.fn();
  const resolve = jest.fn();
  const handleStop = rec["handleStop"](resolve);

  // manual mock
  rec["download"] = download;

  // let's download the file locally
  rec["localDownload"] = true;

  await handleStop();

  // Upload the file to s3
  rec["localDownload"] = false;

  await handleStop();

  expect(download).toHaveBeenCalledTimes(1);
  expect(Data.LookitS3.prototype.completeUpload).toHaveBeenCalledTimes(1);
});

test("Recorder handleDataAvailable", () => {
  const rec = new Recorder(initJsPsych(), "prefix");
  const handleDataAvailable = rec["handleDataAvailable"];
  const event = jest.fn() as unknown as BlobEvent;

  rec["localDownload"] = true;
  handleDataAvailable(event);
  expect(Data.LookitS3.prototype.onDataAvailable).toHaveBeenCalledTimes(0);

  rec["localDownload"] = false;
  handleDataAvailable(event);
  expect(Data.LookitS3.prototype.onDataAvailable).toHaveBeenCalledTimes(1);
});

test("Recorder insert webcam display without height/width", () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(webcam_container_id) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Should add the video element with webcam stream to the webcam container.
  rec.insertWebcamFeed(webcam_div);

  // Use the HTML template and settings to figure out what HTML should have been added.
  const height: CSSWidthHeight = "auto";
  const width: CSSWidthHeight = "100%";
  const webcam_element_id: string = "lookit-jspsych-webcam";
  const params = { height, width, webcam_element_id };
  let rendered_webcam_html = Mustache.render(webcamFeed, params);

  // Remove new lines, indents (tabs or spaces), and empty HTML property values.
  rendered_webcam_html = rendered_webcam_html.replace(/(\r\n|\n|\r|\t|    )/gm, "");
  let displayed_html = document.body.innerHTML;
  displayed_html = displayed_html.replace(/(\r\n|\n|\r|\t|    )/gm, "");
  displayed_html = displayed_html.replace(/(=\"\")/gm, "");

  expect(displayed_html).toContain(rendered_webcam_html);

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Recorder insert webcam display with height/width", () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(webcam_container_id) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Should add the video element with webcam stream to the webcam container,
  // with the specified height and width.
  const height: CSSWidthHeight = "400px";
  const width: CSSWidthHeight = "auto";
  rec.insertWebcamFeed(webcam_div, width, height);

  // Use the HTML template and settings to figure out what HTML should have been added.
  const webcam_element_id: string = "lookit-jspsych-webcam";
  const params = { height, width, webcam_element_id };
  let rendered_webcam_html = Mustache.render(webcamFeed, params);

  // Remove new lines, indents (tabs or spaces), and empty HTML property values.
  rendered_webcam_html = rendered_webcam_html.replace(/(\r\n|\n|\r|\t|    )/gm, "");
  let displayed_html = document.body.innerHTML;
  displayed_html = displayed_html.replace(/(\r\n|\n|\r|\t|    )/gm, "");
  displayed_html = displayed_html.replace(/(=\"\")/gm, "");

  expect(displayed_html).toContain(rendered_webcam_html);

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Webcam feed is removed when stream access stops", async () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(webcam_container_id) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const stopPromise = Promise.resolve();
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  rec["stopPromise"] = stopPromise;
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  rec.insertWebcamFeed(webcam_div);

  expect(document.body.innerHTML).toContain("<video");

  await rec.stop();

  expect(document.body.innerHTML).not.toContain("<video");
});

test("Recorder destroy", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  expect(rec.s3).not.toBe(null);

  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // No in-progress upload, mic check, or stop promise.
  // This should just stop the tracks and set s3 to null.
  await rec.destroy();

  expect(media.stop).toHaveBeenCalledTimes(1);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(1);
  expect(rec.s3).toBe(null);
});

test("Recorder download", async () => {
  const click = jest.fn();

  Object.defineProperty(global, "document", {
    value: {
      addEventListener: jest.fn(),
      createElement: jest.fn().mockReturnValue({ click }),
    },
  });

  const rec = new Recorder(initJsPsych(), "prefix");
  const download = rec["download"];

  await download();

  expect(click).toHaveBeenCalledTimes(1);
});
