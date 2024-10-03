import Data from "@lookit/data";
import { initJsPsych } from "jspsych";
import Mustache from "mustache";
import play_icon from "../img/play-icon.svg";
import record_icon from "../img/record-icon.svg";
import playbackFeed from "../templates/playback-feed.mustache";
import webcamFeed from "../templates/webcam-feed.mustache";
import {
  CreateURLError,
  NoPlayBackElementError,
  NoStopPromiseError,
  NoWebCamElementError,
  RecorderInitializeError,
  S3UndefinedError,
  StreamActiveOnResetError,
  StreamDataInitializeError,
  StreamInactiveInitializeError,
} from "./errors";
import Recorder from "./recorder";
import { CSSWidthHeight } from "./types";

jest.mock("@lookit/data");
jest.mock("jspsych", () => ({
  ...jest.requireActual("jspsych"),
  initJsPsych: jest.fn().mockReturnValue({
    pluginAPI: {
      getCameraRecorder: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        stream: {
          active: true,
          clone: jest.fn(),
          getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        },
      }),
    },
  }),
}));
/**
 * Remove new lines, indents (tabs or spaces), and empty HTML property values.
 *
 * @param html - HTML string
 * @returns Cleaned String
 */
const cleanHTML = (html: string) => {
  return html
    .replace(/(\r\n|\n|\r|\t| {4})/gm, "")
    .replace(/(="")/gm, "")
    .replaceAll("  ", " ")
    .replaceAll("&gt;", ">");
};
afterEach(() => {
  jest.clearAllMocks();
});

test("Recorder start", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const media = jsPsych.pluginAPI.getCameraRecorder();
  await rec.start("consent");

  expect(media.addEventListener).toHaveBeenCalledTimes(2);
  expect(media.start).toHaveBeenCalledTimes(1);
});

test("Recorder stop", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve();
  const media = jsPsych.pluginAPI.getCameraRecorder();

  // manual mocks
  rec["stopPromise"] = stopPromise;

  // check that the "stop promise" is returned on stop
  expect(rec.stop()).toStrictEqual(stopPromise);

  await rec.stop();

  expect(media.stop).toHaveBeenCalledTimes(2);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(2);
});

test("Recorder no stop promise", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // no stop promise
  rec["stopPromise"] = undefined;

  expect(async () => await rec.stop()).rejects.toThrow(NoStopPromiseError);
});
test("Recorder initialize error", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;

  // no recorder
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(undefined);
  jsPsych.pluginAPI.getMicrophoneRecorder = jest
    .fn()
    .mockReturnValue(undefined);

  expect(async () => await rec.start("consent")).rejects.toThrow(
    RecorderInitializeError,
  );

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Recorder handleStop", async () => {
  const rec = new Recorder(initJsPsych());
  const download = jest.fn();
  const resolve = jest.fn();
  const handleStop = rec["handleStop"](resolve);

  // manual mock
  rec["download"] = download;
  rec["blobs"] = ["some recorded data" as unknown as Blob];
  URL.createObjectURL = jest.fn();

  // let's download the file locally
  rec["localDownload"] = true;

  await handleStop();

  // // Upload the file to s3
  rec["localDownload"] = false;
  rec["_s3"] = new Data.LookitS3("some key");

  await handleStop();

  expect(download).toHaveBeenCalledTimes(1);
  expect(Data.LookitS3.prototype.completeUpload).toHaveBeenCalledTimes(1);
});

test("Recorder handleStop error with no url", () => {
  const rec = new Recorder(initJsPsych());
  const resolve = jest.fn();
  const handleStop = rec["handleStop"](resolve);
  expect(async () => await handleStop()).rejects.toThrow(CreateURLError);
});

test("Recorder handleDataAvailable", () => {
  const rec = new Recorder(initJsPsych());
  const handleDataAvailable = rec["handleDataAvailable"];
  const event = jest.fn() as unknown as BlobEvent;

  rec["localDownload"] = true;
  handleDataAvailable(event);
  expect(Data.LookitS3.prototype.onDataAvailable).toHaveBeenCalledTimes(0);

  rec["localDownload"] = false;
  rec["_s3"] = new Data.LookitS3("some key");
  handleDataAvailable(event);
  expect(Data.LookitS3.prototype.onDataAvailable).toHaveBeenCalledTimes(1);
});

test("Recorder insert webcam display without height/width", () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // Should add the video element with webcam stream to the webcam container.
  rec.insertWebcamFeed(webcam_div);

  // Use the HTML template and settings to figure out what HTML should have been added.
  const height: CSSWidthHeight = "auto";
  const width: CSSWidthHeight = "100%";
  const webcam_element_id: string = "lookit-jspsych-webcam";
  const params = { height, width, webcam_element_id, record_icon };

  const rendered_webcam_html = cleanHTML(Mustache.render(webcamFeed, params));
  const displayed_html = cleanHTML(document.body.innerHTML);

  expect(displayed_html).toContain(rendered_webcam_html);

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Recorder insert webcam display with height/width", () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // Should add the video element with webcam stream to the webcam container,
  // with the specified height and width.
  const height: CSSWidthHeight = "400px";
  const width: CSSWidthHeight = "auto";
  rec.insertWebcamFeed(webcam_div, width, height);

  // Use the HTML template and settings to figure out what HTML should have been added.
  const webcam_element_id: string = "lookit-jspsych-webcam";
  const params = { height, width, webcam_element_id, record_icon };
  const rendered_webcam_html = cleanHTML(Mustache.render(webcamFeed, params));
  const displayed_html = cleanHTML(document.body.innerHTML);

  expect(displayed_html).toContain(rendered_webcam_html);

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Webcam feed is removed when stream access stops", async () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve();

  rec["stopPromise"] = stopPromise;
  rec.insertWebcamFeed(webcam_div);
  expect(document.body.innerHTML).toContain("<video");

  await rec.stop();
  expect(document.body.innerHTML).not.toContain("<video");

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Recorder initializeRecorder", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;

  // MediaRecorder is not available in Jest/jsDom, so mock the implementation of jsPsych.pluginAPI.initializeCameraRecorder (which calls new MediaRecorder) and jsPsych.pluginAPI.getCameraRecorder (which gets the private recorder that was created via jsPsych's initializeCameraRecorder).
  const stream = { fake: "stream" } as unknown as MediaStream;
  const recorder = jest.fn((stream: MediaStream) => {
    return {
      stream: stream,
      start: jest.fn(),
      ondataavailable: jest.fn(),
      onerror: jest.fn(),
      state: "",
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    };
  });

  jsPsych.pluginAPI.initializeCameraRecorder = jest
    .fn()
    .mockImplementation((stream: MediaStream) => {
      return recorder(stream);
    });
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockImplementation(() => {
    return jsPsych.pluginAPI.initializeCameraRecorder(stream);
  });

  rec.initializeRecorder(stream);

  expect(jsPsych.pluginAPI.initializeCameraRecorder).toHaveBeenCalled();
  expect(rec["stream"]).toStrictEqual(stream);

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Recorder download", () => {
  const rec = new Recorder(initJsPsych());
  rec["url"] = "some url";
  rec["filename"] = "some filename";
  const download = rec["download"];
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click");

  download();

  expect(click).toHaveBeenCalledTimes(1);
});

test("Recorder s3 get error when undefined", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  expect(() => rec["s3"]).toThrow(S3UndefinedError);
});

test("Recorder reset error when stream active", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  expect(() => rec.reset()).toThrow(StreamActiveOnResetError);
});

test("Recorder reset", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;
  const streamClone = jest.fn();

  jsPsych.pluginAPI.getCameraRecorder = jest
    .fn()
    .mockReturnValue({ stream: { active: false } });
  rec["streamClone"] = {
    clone: jest.fn().mockReturnValue(streamClone),
  } as unknown as MediaStream;
  rec["blobs"] = ["some stream data" as unknown as Blob];

  expect(rec["blobs"]).not.toStrictEqual([]);

  rec.reset();

  expect(jsPsych.pluginAPI.initializeCameraRecorder).toHaveBeenCalledTimes(1);
  expect(jsPsych.pluginAPI.initializeCameraRecorder).toHaveBeenCalledWith(
    streamClone,
    undefined,
  );
  expect(rec["blobs"]).toStrictEqual([]);

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Record insert webcam feed error when no element", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const div = { querySelector: jest.fn() } as unknown as HTMLDivElement;
  expect(() => rec.insertWebcamFeed(div)).toThrow(NoWebCamElementError);
});

test("Record insert Playback feed", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const webcam_container_id = "webcam-container";
  const height: CSSWidthHeight = "auto";
  const width: CSSWidthHeight = "100%";
  const playback_element_id: string = "lookit-jspsych-playback";

  rec["url"] = "some url";

  const view = {
    src: rec["url"],
    width,
    height,
    playback_element_id,
    play_icon,
  };

  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  rec.insertPlaybackFeed(webcam_div, () => {});
  const tempHtml = cleanHTML(Mustache.render(playbackFeed, view));
  const docHtml = cleanHTML(document.body.innerHTML);

  expect(docHtml).toContain(tempHtml);

  document.body.innerHTML = "";
});

test("Record insert Playback feed error if no container", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const div = {
    querySelector: jest.fn(),
    insertAdjacentHTML: jest.fn(),
  } as unknown as HTMLDivElement;
  expect(() => rec.insertPlaybackFeed(div, () => {})).toThrow(
    NoPlayBackElementError,
  );
});

test("Record initialize error inactive stream", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const initializeCheck = rec["initializeCheck"];
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;

  jsPsych.pluginAPI.getCameraRecorder = jest
    .fn()
    .mockReturnValue({ stream: { active: false } });

  expect(() => initializeCheck()).toThrow(StreamInactiveInitializeError);

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Record initialize error inactive stream", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const initializeCheck = rec["initializeCheck"];

  rec["blobs"] = ["some stream data" as unknown as Blob];

  expect(() => initializeCheck()).toThrow(StreamDataInitializeError);
});
