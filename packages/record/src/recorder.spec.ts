/* eslint-disable @typescript-eslint/no-explicit-any */
// explicit any needed for media recorder mocks
import Data from "@lookit/data";
import { LookitWindow } from "@lookit/data/dist/types";
import Handlebars from "handlebars";
import { initJsPsych } from "jspsych";
import playbackFeed from "../hbs/playback-feed.hbs";
import recordFeed from "../hbs/record-feed.hbs";
import webcamFeed from "../hbs/webcam-feed.hbs";
import play_icon from "../img/play-icon.svg";
import record_icon from "../img/record-icon.svg";
import {
  CreateURLError,
  NoFileNameError,
  NoStopPromiseError,
  NoWebCamElementError,
  RecorderInitializeError,
  S3UndefinedError,
  StreamActiveOnResetError,
  StreamDataInitializeError,
  StreamInactiveInitializeError,
  TimeoutError,
} from "./errors";
import Recorder from "./recorder";
import { CSSWidthHeight } from "./types";

declare const window: LookitWindow;

window.chs = {
  study: {
    id: "123",
  },
  response: {
    id: "456",
  },
  pendingUploads: [],
} as unknown as typeof window.chs;

let originalDate: DateConstructor;

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

type MockStream = {
  getTracks: jest.Mock<Array<{ stop: jest.Mock<void, []> }>, []>;
  clone: () => MockStream;
  readonly active: boolean;
  /** Utility for tests - manually force stream to stop (inactive state). */
  __forceStop: () => void;
  /** Utility for tests - manually force stream to start (active state). */
  __forceStart: () => void;
};

jest.mock("@lookit/data");
jest.mock("jspsych", () => {
  /**
   * Helper to create a mock stream. The mock for
   * jsPsych.pluginAPI.getCameraRecorder().stream will use this so that it
   * dynamically returns streams that are active/inactive based on whether or
   * not they've been stopped.
   *
   * @returns Mocked stream
   */
  const createMockStream = (): MockStream => {
    let stopped = false;

    const stream: MockStream = {
      // need to mock 'active', 'clone()', and 'getTracks()`
      getTracks: jest.fn(() => {
        return [
          {
            stop: jest.fn(() => {
              stopped = true;
            }),
          },
        ];
      }),
      clone: jest.fn(() => createMockStream()),
      /**
       * Getter for stream's active property
       *
       * @returns Boolean indicating whether or not the stream is active.
       */
      get active() {
        return !stopped;
      },
      /** Utility for tests - manually force stream to stop (inactive state). */
      __forceStop: () => {
        stopped = true;
      },
      /** Utility for tests - maually force stream to start (active state). */
      __forceStart: () => {
        stopped = false;
      },
    };

    return stream;
  };

  /**
   * Persistent recorder that always gets returned
   *
   * @returns Mock recorder object
   */
  const createMockRecorder = () => {
    return {
      addEventListener: jest.fn(),
      mimeType: "video/webm",
      start: jest.fn(),
      stop: jest.fn(),
      stream: createMockStream(),
    };
  };

  return {
    ...jest.requireActual("jspsych"),
    // factories for tests to call
    __createMockRecorder: createMockRecorder,
    __createMockStream: createMockStream,
    initJsPsych: jest.fn().mockImplementation(() => {
      const recorder = createMockRecorder();
      return {
        pluginAPI: {
          initializeCameraRecorder: jest.fn((stream) => {
            recorder.stream = stream;
          }),
          getCameraRecorder: jest.fn(() => recorder),
        },
        data: {
          getLastTrialData: jest.fn().mockReturnValue({
            values: jest
              .fn()
              .mockReturnValue([{ trial_type: "test-type", trial_index: 0 }]),
          }),
        },
      };
    }),
  };
});

/**
 * Remove new lines, indents (tabs or spaces), and empty HTML property values.
 *
 * @param html - HTML string
 * @returns Cleaned String
 */
const cleanHTML = (html: string) => {
  return (
    html
      // attributes equals empty string (disabled="")
      .replace(/(="")/gm, "")
      // encoded greater than
      .replace(/(&gt;)/gm, ">")
      // Space before string value of attributes (version=" 1.0")
      .replace(/(=" )/gm, '="')
      // Multiple whitespaces
      .replace(/\s\s+/gm, " ")
      // Whitespace and or slash before html element end (<img />)
      .replace(/\s*\/*>/gm, ">")
  );
};

beforeEach(() => {
  jest.useFakeTimers();
  window.chs.pendingUploads = [];

  // Hide the console output during tests. Tests can still assert on these spies to check console calls.
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();

  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("Recorder start", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const media = jsPsych.pluginAPI.getCameraRecorder();
  await rec.start(true, "video-consent");

  expect(media.addEventListener).toHaveBeenCalledTimes(2);
  expect(media.start).toHaveBeenCalledTimes(1);
});

test("Recorder stop", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");
  const uploadPromise = Promise.resolve();

  // capture the actual mocked recorder and stream so that we can assert on the same instance
  const recorderInstance = jsPsych.pluginAPI.getCameraRecorder();
  const streamInstance = recorderInstance.stream;

  // spy on Recorder helper functions
  const preStopCheckSpy = jest.spyOn(rec as any, "preStopCheck");
  const clearWebcamFeedSpy = jest.spyOn(rec as any, "clearWebcamFeed");
  const stopTracksSpy = jest.spyOn(rec as any, "stopTracks");
  const resetSpy = jest.spyOn(rec as any, "reset");
  const getTracksSpy = jest.spyOn(streamInstance, "getTracks");

  // set the s3 completeUpload function to resolve
  rec["_s3"] = { completeUpload: jest.fn() } as any;
  jest.spyOn(rec["_s3"] as any, "completeUpload").mockResolvedValue(undefined);

  // manual mocks to simulate having started recording
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  expect(window.chs.pendingUploads).toStrictEqual([]);

  const { stopped, uploaded } = rec.stop();
  await stopped;

  // calls recorder.preStopCheck()
  expect(preStopCheckSpy).toHaveBeenCalledTimes(1);
  // calls recorder.clearWebcamFeed(maintain_container_size)
  expect(clearWebcamFeedSpy).toHaveBeenCalledTimes(1);
  // calls recorder.stopTracks(), which calls stop() and stream.getTracks()
  expect(stopTracksSpy).toHaveBeenCalledTimes(1);
  expect(jsPsych.pluginAPI.getCameraRecorder().stop).toHaveBeenCalledTimes(1);
  expect(getTracksSpy).toHaveBeenCalledTimes(1);
  // calls recorder.reset
  expect(resetSpy).toHaveBeenCalledTimes(1);

  await uploaded;

  expect(rec["s3"].completeUpload).toHaveBeenCalledTimes(1);

  // check that the stop and upload promises are returned on stop
  expect({ stopped, uploaded }).toStrictEqual({
    stopped: stopPromise,
    uploaded: uploadPromise,
  });

  // adds promise to window.chs.pendingUploads
  expect(window.chs.pendingUploads.length).toBe(1);
  expect(window.chs.pendingUploads[0]).toBeInstanceOf(Promise);
});

test("Recorder stop with no stop promise", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // no stop promise
  rec["stopPromise"] = undefined;

  // throws immediately - no need to await the returned promises
  expect(rec.stop).toThrow(NoStopPromiseError);
});

test("Recorder stop and upload promises resolve", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // stop promise will resolve
  rec["stopPromise"] = Promise.resolve("url");

  // completeUpload will resolve
  rec["_s3"] = { completeUpload: jest.fn(() => Promise.resolve()) } as any;

  // manual mocks to simulate having started recording
  rec["filename"] = "fakename";

  const { stopped, uploaded } = rec.stop({
    stop_timeout_ms: 100,
  });

  await jest.advanceTimersByTimeAsync(101);

  await expect(stopped).resolves.toBe("url");
  await expect(uploaded).resolves.toBeUndefined();
  // make sure timeouts are cleared
  expect(jest.getTimerCount()).toEqual(0);
});

test("Recorder stop promise times out", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // create a stop promise that never resolves
  rec["stopPromise"] = new Promise<string>(() => {});

  // manual mocks to simulate having started recording
  rec["_s3"] = {
    completeUpload: jest.fn().mockResolvedValue(undefined),
  } as any;
  rec["filename"] = "fakename";

  const { stopped, uploaded } = rec.stop({
    stop_timeout_ms: 100,
  });

  const stoppedObserved = stopped.catch((e) => e);
  const uploadedObserved = uploaded.catch((e) => e);

  await jest.advanceTimersByTimeAsync(101);

  await expect(stoppedObserved).resolves.toBe("timeout");
  await expect(uploadedObserved).resolves.toThrow(TimeoutError);
  expect(consoleWarnSpy).toHaveBeenCalledWith("Recorder stop timed out");
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Upload failed because recorder stop timed out",
  );
});

test("Recorder upload timeout with default duration", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // stop promise will resolve
  rec["stopPromise"] = Promise.resolve("url");
  rec["filename"] = "fakename";

  // completeUpload never resolves - upload promise will timeout
  const never = new Promise<void>(() => {});
  rec["_s3"] = { completeUpload: jest.fn(() => never) } as any;

  // default upload_timeout_ms is 10000
  const { stopped, uploaded } = rec.stop();

  // stop promise should resolve with the url
  const url = await stopped;
  expect(url).toBe("url");

  // advance time by 10000 ms to trigger timeout
  await jest.advanceTimersByTimeAsync(10000);

  await expect(uploaded).resolves.toBe("timeout");
  expect(consoleWarnSpy).toHaveBeenCalledWith("Recorder upload timed out");
});

test("Recorder upload promise times out with duration parameter", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // stop promise will resolve
  rec["stopPromise"] = Promise.resolve("url");
  rec["filename"] = "fakename";

  // completeUpload never resolves - upload promise will timeout
  const never = new Promise<void>(() => {});
  rec["_s3"] = { completeUpload: jest.fn(() => never) } as any;

  const { stopped, uploaded } = rec.stop({
    upload_timeout_ms: 100,
  });

  // stop promise should resolve with the url
  await expect(stopped).resolves.toBe("url");

  // advance fake timers so that the timeout triggers
  await jest.advanceTimersByTimeAsync(100);
  await expect(uploaded).resolves.toBe("timeout");
  expect(consoleWarnSpy).toHaveBeenCalledWith("Recorder upload timed out");
});

test("Recorder stop with local download", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");
  const uploadPromise = Promise.resolve();

  // Download the file locally
  rec["localDownload"] = true;

  // manual mocks to simulate having started recording
  // s3 is not defined when localDownload is true
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;
  const download = jest.fn();
  rec["download"] = download;

  expect(window.chs.pendingUploads).toStrictEqual([]);

  const { stopped, uploaded } = rec.stop();

  await uploaded;

  // upload promise should call download
  expect(download).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledWith(rec["filename"], "url");

  // check that the stop and upload promises are returned from recorder.stop
  expect({ stopped, uploaded }).toStrictEqual({
    stopped: stopPromise,
    uploaded: uploadPromise,
  });

  // adds promise to window.chs.pendingUploads
  expect(window.chs.pendingUploads.length).toBe(1);
  expect(window.chs.pendingUploads[0]).toBeInstanceOf(Promise);
});

test("Recorder stop with no filename", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks to simulate having started recording
  rec["stopPromise"] = stopPromise;
  rec["_s3"] = new Data.LookitS3("some key");

  // no filename
  rec["filename"] = undefined;

  expect(rec.stop).toThrow(NoFileNameError);
});

test("Recorder stop throws with inactive stream", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks to simulate having started recording
  rec["stopPromise"] = stopPromise;
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "filename";

  // de-activate stream
  (
    jsPsych.pluginAPI.getCameraRecorder().stream as unknown as MockStream
  ).__forceStop();

  expect(rec.stop).toThrow(StreamInactiveInitializeError);
});

test("Recorder stop catches error in local download", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // Download the file locally
  rec["localDownload"] = true;

  // manual mocks to simulate having started recording
  // s3 is not defined when localDownload is true
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;
  const download = jest.fn().mockImplementation(() => {
    throw new Error("Something went wrong.");
  });
  rec["download"] = download;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stopped, uploaded } = rec.stop();

  await expect(uploaded).rejects.toThrow("Something went wrong.");
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Local download failed: ",
    Error("Something went wrong."),
  );
});

test("Recorder stop catches error in upload", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // set the s3 completeUpload function to resolve
  rec["_s3"] = { completeUpload: jest.fn() } as any;
  jest.spyOn(rec["_s3"] as any, "completeUpload").mockImplementation(() => {
    throw new Error("Something broke.");
  });

  // manual mocks to simulate having started recording
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  expect(window.chs.pendingUploads).toStrictEqual([]);

  const { stopped, uploaded } = rec.stop();

  await stopped;

  await expect(uploaded).rejects.toThrow("Something broke.");
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Upload failed: ",
    Error("Something broke."),
  );
});

test("Recorder stop tries to reset after stopping and handles error", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks to simulate having started recording
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;
  rec["_s3"] = new Data.LookitS3("some key");

  const reset = jest.fn().mockImplementation(() => {
    throw new Error("Reset failed.");
  });
  rec["reset"] = reset;

  const { stopped } = rec.stop();

  await stopped;

  expect(reset).toHaveBeenCalledTimes(1);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Error while resetting recorder after stop: ",
    Error("Reset failed."),
  );
});

test("Recorder initialize error throws from recorder start", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;

  // no recorder
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(undefined);
  jsPsych.pluginAPI.getMicrophoneRecorder = jest
    .fn()
    .mockReturnValue(undefined);

  expect(async () => await rec.start(true, "video-consent")).rejects.toThrow(
    RecorderInitializeError,
  );

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Recorder initialize error throws from recorder stop", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const getCameraRecorder = jsPsych.pluginAPI.getCameraRecorder;

  // fy other requirements for recorder.stop
  rec["stopPromise"] = new Promise<string>(() => {});
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "fakename";

  // no recorder
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(undefined);
  jsPsych.pluginAPI.getMicrophoneRecorder = jest
    .fn()
    .mockReturnValue(undefined);

  expect(rec.stop).toThrow(RecorderInitializeError);

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("S3 undefined error throws from recorder stop", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // satisfy other requirements for recorder.stop
  rec["stopPromise"] = new Promise<string>(() => {});
  rec["filename"] = "fakename";

  // no s3
  rec["_s3"] = undefined;

  rec["localDownload"] = false;

  expect(rec.stop).toThrow(S3UndefinedError);
});

test("S3 undefined error does not throw from recorder stop with local download", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // satisty other requirements for recorder.stop and s3 upload
  rec["stopPromise"] = new Promise<string>(() => {});
  rec["filename"] = "fakename";

  // no s3
  rec["_s3"] = undefined;

  rec["localDownload"] = true;

  expect(rec.stop).not.toThrow(S3UndefinedError);
});

test("Recorder handleStop", () => {
  // Mock createObjectURL to return a specific value
  const originalCreateObjectURL = global.URL.createObjectURL;
  global.URL.createObjectURL = jest.fn().mockReturnValue("mock-url");

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // stop promise resolve function that is passed into handleStop
  const resolve = jest.fn();

  // Manual mock
  rec["blobs"] = ["some recorded data" as unknown as Blob];

  const handleStop = rec["handleStop"](resolve);

  handleStop();

  expect(resolve).toHaveBeenCalledWith("mock-url");
  expect(rec["url"]).toBe("mock-url");

  // Restore the original createObjectURL function
  global.URL.createObjectURL = originalCreateObjectURL;
});

test("Recorder handleStop error with no blob data", () => {
  const rec = new Recorder(initJsPsych());
  const resolve = jest.fn();
  const handleStop = rec["handleStop"](resolve);
  expect(handleStop).toThrow(CreateURLError);
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

  const rendered_webcam_html = cleanHTML(
    Handlebars.compile(webcamFeed)(params),
  );
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
  const rendered_webcam_html = cleanHTML(
    Handlebars.compile(webcamFeed)(params),
  );
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
  const stopPromise = Promise.resolve("url");

  // manual mocks
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  rec.insertWebcamFeed(webcam_div);
  expect(document.body.innerHTML).toContain("<video");

  await rec.stop();
  expect(document.body.innerHTML).not.toContain("<video");

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Webcam feed container maintains size with maintain_container_size: true passed to recorder.stop", async () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  rec.insertWebcamFeed(webcam_div);

  // Mock the return values for the video element's offsetHeight/offsetWidth, which are used to set the container size
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetWidth", "get")
    .mockImplementation(() => 400);
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetHeight", "get")
    .mockImplementation(() => 300);

  const { stopped } = rec.stop({ maintain_container_size: true });
  await stopped;

  // Container div's dimensions should match the video element dimensions
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .width,
  ).toBe("400px");
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .height,
  ).toBe("300px");

  document.body.innerHTML = "";
  // restore the offsetWidth/offsetHeight getters
  jest.restoreAllMocks();
});

test("Webcam feed container size is not maintained with recorder.stop(false)", async () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  rec.insertWebcamFeed(webcam_div);

  // Mock the return values for the video element offsetHeight/offsetWidth, which are used to set the container size
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetWidth", "get")
    .mockImplementation(() => 400);
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetHeight", "get")
    .mockImplementation(() => 300);

  await rec.stop();

  // Container div's dimensions should not be set
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .width,
  ).toBe("");
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .height,
  ).toBe("");

  document.body.innerHTML = "";
  // restore the offsetWidth/offsetHeight getters
  jest.restoreAllMocks();
});

test("Webcam feed container size is not maintained with recorder.stop()", () => {
  // Add webcam container to document body.
  const webcam_container_id = "webcam-container";
  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const stopPromise = Promise.resolve("url");

  // manual mocks
  rec["_s3"] = new Data.LookitS3("some key");
  rec["filename"] = "fakename";
  rec["stopPromise"] = stopPromise;

  rec.insertWebcamFeed(webcam_div);

  // Mock the return values for the video element offsetHeight/offsetWidth, which are used to set the container size
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetWidth", "get")
    .mockImplementation(() => 400);
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetHeight", "get")
    .mockImplementation(() => 300);

  rec.stop();

  // Container div's dimensions should not be set
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .width,
  ).toBe("");
  expect(
    (document.getElementById(webcam_container_id) as HTMLDivElement).style
      .height,
  ).toBe("");

  document.body.innerHTML = "";
  jest.restoreAllMocks();
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
  const download = rec["download"];
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click");

  download("some filename", "some url");

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
  expect(rec.reset).toThrow(StreamActiveOnResetError);
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
    { mimeType: "video/webm" },
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
  const webcam_element_id: string = "lookit-jspsych-webcam";

  rec["url"] = "some url";

  const view = {
    src: rec["url"],
    width,
    height,
    webcam_element_id,
    play_icon,
  };

  document.body.innerHTML = `<div id="${webcam_container_id}"></div>`;
  const webcam_div = document.getElementById(
    webcam_container_id,
  ) as HTMLDivElement;

  rec.insertPlaybackFeed(webcam_div, () => {});

  const tempHtml = cleanHTML(Handlebars.compile(playbackFeed)(view));
  const docHtml = cleanHTML(
    document.body.querySelector("#webcam-container")!.innerHTML,
  );

  expect(docHtml).toStrictEqual(tempHtml);

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
    NoWebCamElementError,
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

  expect(initializeCheck).toThrow(StreamInactiveInitializeError);

  jsPsych.pluginAPI.getCameraRecorder = getCameraRecorder;
});

test("Record initialize error inactive stream", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const initializeCheck = rec["initializeCheck"];

  rec["blobs"] = ["some stream data" as unknown as Blob];

  expect(initializeCheck).toThrow(StreamDataInitializeError);
});

test("Recorder insert record Feed with height/width", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);
  const display = document.createElement("div");

  const view = {
    height: "auto",
    width: "100%",
    webcam_element_id: "lookit-jspsych-webcam",
    record_icon,
  };

  jest.spyOn(Handlebars, "compile");
  jest.spyOn(rec as any, "insertVideoFeed");

  rec.insertRecordFeed(display);

  expect(Handlebars.compile).toHaveBeenCalledWith(recordFeed);
  expect(rec["insertVideoFeed"]).toHaveBeenCalledWith(
    display,
    Handlebars.compile(recordFeed)(view),
  );
});

test("Recorder createFileName constructs video file names correctly", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  // Mock Date().getTime() timestamp
  originalDate = Date;
  const mockTimestamp = 1634774400000;
  jest.spyOn(global, "Date").mockImplementation(() => {
    return new originalDate(mockTimestamp);
  });
  // Mock random 3-digit number
  jest.spyOn(global.Math, "random").mockReturnValue(0.123456789);
  const rand_digits = Math.floor(Math.random() * 1000);

  const index = jsPsych.data.getLastTrialData().values()[0].trial_index + 1;
  const trial_type = "test-type";

  // Consent prefix is "consent-videoStream"
  expect(rec["createFileName"](true, trial_type)).toBe(
    `consent-videoStream_${window.chs.study.id}_${index.toString()}-${trial_type}_${window.chs.response.id}_${mockTimestamp.toString()}_${rand_digits.toString()}.webm`,
  );

  // Non-consent prefix is "videoStream"
  expect(rec["createFileName"](false, trial_type)).toBe(
    `videoStream_${window.chs.study.id}_${index.toString()}-${trial_type}_${window.chs.response.id}_${mockTimestamp.toString()}_${rand_digits.toString()}.webm`,
  );

  // Trial index is 0 if there's no value for 'last trial index' (jsPsych data is empty)
  jsPsych.data.getLastTrialData = jest.fn().mockReturnValueOnce({
    values: jest.fn().mockReturnValue([]),
  });
  expect(rec["createFileName"](false, trial_type)).toBe(
    `videoStream_${window.chs.study.id}_${0}-${trial_type}_${window.chs.response.id}_${mockTimestamp.toString()}_${rand_digits.toString()}.webm`,
  );

  // Restore the original Date constructor
  global.Date = originalDate;
  // Restore Math.random
  jest.spyOn(global.Math, "random").mockRestore();
});

test("Initializing a new recorder gets the mime type from the initialization", () => {
  const jsPsych = initJsPsych();
  const originalInitializeCameraRecorder =
    jsPsych.pluginAPI.initializeCameraRecorder;

  const stream = {
    active: true,
    clone: jest.fn(),
    getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
  } as unknown as MediaStream;

  jsPsych.pluginAPI.initializeCameraRecorder = jest
    .fn()
    .mockImplementation(
      (stream: MediaStream, recorder_options: MediaRecorderOptions) => {
        return {
          addEventListener: jest.fn(),
          mimeType: recorder_options.mimeType,
          start: jest.fn(),
          stop: jest.fn(),
          stream: stream,
        };
      },
    );

  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockImplementation(() => {
    return jsPsych.pluginAPI.initializeCameraRecorder(stream, recorder_options);
  });

  // Initialize with vp9
  let recorder_options: MediaRecorderOptions = {
    mimeType: "video/webm;codecs=vp9,opus",
  };
  jsPsych.pluginAPI.initializeCameraRecorder(stream, recorder_options);
  const rec_1 = new Recorder(jsPsych);
  // Called twice per construction - once for stream clone and once for mime type
  expect(jsPsych.pluginAPI.getCameraRecorder).toHaveBeenCalledTimes(2);
  expect(rec_1["mimeType"]).toBe("video/webm;codecs=vp9,opus");

  // Initialize with vp8
  recorder_options = {
    mimeType: "video/webm;codecs=vp8,opus",
  };
  jsPsych.pluginAPI.initializeCameraRecorder(stream, recorder_options);
  const rec_2 = new Recorder(jsPsych);
  expect(jsPsych.pluginAPI.getCameraRecorder).toHaveBeenCalledTimes(4);
  expect(rec_2["mimeType"]).toBe("video/webm;codecs=vp8,opus");

  jsPsych.pluginAPI.initializeCameraRecorder = originalInitializeCameraRecorder;
});

test("New recorder uses a default mime type if none is set already", () => {
  const jsPsych = initJsPsych();
  const originalInitializeCameraRecorder =
    jsPsych.pluginAPI.initializeCameraRecorder;

  const stream = {
    active: true,
    clone: jest.fn(),
    getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
  } as unknown as MediaStream;

  jsPsych.pluginAPI.initializeCameraRecorder = jest
    .fn()
    .mockImplementation((stream: MediaStream) => {
      return {
        addEventListener: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        stream: stream,
      };
    });

  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockImplementation(() => {
    return jsPsych.pluginAPI.initializeCameraRecorder(stream);
  });

  jsPsych.pluginAPI.initializeCameraRecorder(stream);
  const rec = new Recorder(jsPsych);
  // Called twice per construction - once for stream clone and once for mime type
  expect(jsPsych.pluginAPI.getCameraRecorder).toHaveBeenCalledTimes(2);
  expect(rec["mimeType"]).toBe("video/webm");

  jsPsych.pluginAPI.initializeCameraRecorder = originalInitializeCameraRecorder;
});

test("Recorder generates a timeout handler function with the event that is being awaited", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych);

  const timeout_fn = rec["createTimeoutHandler"]("long process");

  expect(timeout_fn).toBeInstanceOf(Function);

  timeout_fn();

  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Recorder long process timed out",
  );
});
