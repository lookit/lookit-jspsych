import Data from "@lookit/data";
import { initJsPsych } from "jspsych";
import Mustache from "mustache";
import webcamFeed from "../templates/webcam-feed.mustache";
import {
  NoStopPromiseError,
  NoStreamError,
  RecorderInitializeError,
} from "./errors";
import Recorder from "./recorder";
import { CSSWidthHeight } from "./types";

jest.mock("@lookit/data");

afterEach(() => {
  jest.clearAllMocks();
});

test("Recorder filename", () => {
  const prefix = "prefix";
  const rec = new Recorder(initJsPsych(), prefix);
  expect(rec["filename"]).toContain(prefix);
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
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

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
  rendered_webcam_html = rendered_webcam_html.replace(
    /(\r\n|\n|\r|\t| {4})/gm,
    "",
  );
  let displayed_html = document.body.innerHTML;
  displayed_html = displayed_html.replace(/(\r\n|\n|\r|\t| {4})/gm, "");
  displayed_html = displayed_html.replace(/(="")/gm, "");

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
  rendered_webcam_html = rendered_webcam_html.replace(
    /(\r\n|\n|\r|\t| {4})/gm,
    "",
  );
  let displayed_html = document.body.innerHTML;
  displayed_html = displayed_html.replace(/(\r\n|\n|\r|\t| {4})/gm, "");
  displayed_html = displayed_html.replace(/(="")/gm, "");

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

  expect(rec["s3"]).not.toBe(null);

  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Destroy with no in-progress upload or mic check.
  // This should just stop the tracks and set s3 to null.
  await rec.destroy();

  expect(media.stop).toHaveBeenCalledTimes(1);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(1);
  expect(rec["s3"]).toBe(null);
  expect(Data.LookitS3.prototype.completeUpload).not.toHaveBeenCalled();
});

test("Recorder destroy with in-progress upload", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    addEventListener: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  await rec.start();
  expect(media.start).toHaveBeenCalledTimes(1);

  const stopPromise = Promise.resolve();
  rec["stopPromise"] = stopPromise;

  Object.defineProperty(rec["s3"], "uploadInProgress", {
    /**
     * Overwrite the getter method for S3's uploadInProgress.
     *
     * @returns Boolean.
     */
    get: () => true,
  });

  // Destroy with in-progress upload.
  // This should call stop on the recorder and complete the upload.
  await rec.destroy();
  expect(media.stop).toHaveBeenCalledTimes(1);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(1);
  expect(rec["s3"]).toBe(null);
  expect(Data.LookitS3.prototype.completeUpload).toHaveBeenCalledTimes(1);
});

test("Recorder destroy with webcam display", async () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  rec.insertWebcamFeed(webcam_div);
  expect(document.body.innerHTML).toContain("<video");

  // Destroy with webcam display.
  // This should call stop on the recorder and remove the video element.
  await rec.destroy();
  expect(media.stop).toHaveBeenCalledTimes(1);
  expect(media.stream.getTracks).toHaveBeenCalledTimes(1);
  expect(rec["s3"]).toBe(null);
  expect(document.body.innerHTML).not.toContain("<video");
});

test("Recorder camMicAccess", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  // No recorder initialized
  expect(rec.camMicAccess()).toBe(false);

  // Recorder initialized but stream is not active
  const stream_active_undefined = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest
    .fn()
    .mockReturnValue(stream_active_undefined);
  expect(rec.camMicAccess()).toBe(false);
  const stream_inactive = {
    stream: {
      active: false,
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest
    .fn()
    .mockReturnValue(stream_inactive);
  expect(rec.camMicAccess()).toBe(false);

  // Recorder exists with active stream
  const stream_active = {
    stop: jest.fn(),
    stream: {
      active: true,
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest
    .fn()
    .mockReturnValue(stream_active);
  expect(rec.camMicAccess()).toBe(true);
});

test("Recorder requestPermission", async () => {
  const stream = { fake: "stream" } as unknown as MediaStream;
  const mockGetUserMedia = jest.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolve(stream);
      }),
  );
  Object.defineProperty(global.navigator, "mediaDevices", {
    writable: true,
    value: {
      getUserMedia: mockGetUserMedia,
    },
  });

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const constraints = { video: true, audio: true };

  const returnedStream = await rec.requestPermission(constraints);
  expect(returnedStream).toStrictEqual(stream);
  expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
    constraints,
  );
});

test("Recorder getDeviceLists", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

  const mic1 = {
    deviceId: "mic1",
    kind: "audioinput",
    label: "",
    groupId: "default",
  } as MediaDeviceInfo;
  const cam1 = {
    deviceId: "cam1",
    kind: "videoinput",
    label: "",
    groupId: "default",
  } as MediaDeviceInfo;
  const mic2 = {
    deviceId: "mic2",
    kind: "audioinput",
    label: "",
    groupId: "other",
  } as MediaDeviceInfo;
  const cam2 = {
    deviceId: "cam2",
    kind: "videoinput",
    label: "",
    groupId: "other",
  } as MediaDeviceInfo;

  // Returns the mic/cam devices from navigator.mediaDevices.enumerateDevices as an object with 'cameras' and 'mics' (arrays of media device info objects).
  const devices = [mic1, mic2, cam1, cam2];
  Object.defineProperty(global.navigator, "mediaDevices", {
    writable: true,
    value: {
      enumerateDevices: jest.fn(
        () =>
          new Promise<MediaDeviceInfo[]>((resolve) => {
            resolve(devices);
          }),
      ),
    },
  });

  const returnedDevices = await rec.getDeviceLists();
  expect(global.navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(
    1,
  );
  expect(returnedDevices).toHaveProperty("cameras");
  expect(returnedDevices).toHaveProperty("mics");
  expect(returnedDevices.cameras.sort()).toStrictEqual([cam1, cam2].sort());
  expect(returnedDevices.mics.sort()).toStrictEqual([mic1, mic2].sort());

  // Removes duplicate devices and handles empty device categories.
  const devices_duplicate = [mic1, mic1, mic1];
  Object.defineProperty(global.navigator, "mediaDevices", {
    writable: true,
    value: {
      enumerateDevices: jest.fn(
        () =>
          new Promise<MediaDeviceInfo[]>((resolve) => {
            resolve(devices_duplicate);
          }),
      ),
    },
  });

  const returnedDevicesDuplicates = await rec.getDeviceLists();
  expect(returnedDevicesDuplicates.cameras).toStrictEqual([]);
  expect(returnedDevicesDuplicates.mics).toStrictEqual([mic1]);
});

test("Recorder initializeRecorder", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");

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

  rec.intializeRecorder(stream);

  expect(jsPsych.pluginAPI.initializeCameraRecorder).toHaveBeenCalled();
  expect(rec["recorder"]).toBeDefined();
  expect(rec["recorder"]).not.toBeNull();
  expect(rec["stream"]).toStrictEqual(stream);
});

test("Recorder onMicActivityLevel", () => {
  const rec = new Recorder(initJsPsych(), "prefix");

  type micEventType = {
    currentActivityLevel: number;
    minVolume: number;
    resolve: () => void;
  };
  const event_fail = {
    currentActivityLevel: 0.0001,
    minVolume: rec["minVolume"],
    resolve: jest.fn(),
  } as micEventType;

  expect(rec.micChecked).toBe(false);
  rec["onMicActivityLevel"](
    event_fail.currentActivityLevel,
    event_fail.minVolume,
    event_fail.resolve,
  );
  expect(rec.micChecked).toBe(false);
  expect(event_fail.resolve).not.toHaveBeenCalled();

  const event_pass = {
    currentActivityLevel: 0.2,
    minVolume: rec["minVolume"],
    resolve: jest.fn(),
  } as micEventType;

  expect(rec.micChecked).toBe(false);
  rec["onMicActivityLevel"](
    event_pass.currentActivityLevel,
    event_pass.minVolume,
    event_pass.resolve,
  );
  expect(rec.micChecked).toBe(true);
  expect(event_pass.resolve).toHaveBeenCalled();
});

test("Recorder mic check throws error if no stream", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {};
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);
  expect(async () => {
    await rec.checkMic();
  }).rejects.toThrow(NoStreamError);
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
