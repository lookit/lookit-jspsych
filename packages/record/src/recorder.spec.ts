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

declare const window: LookitWindow;

window.chs = {
  study: {
    id: "123",
  },
  response: {
    id: "456",
  },
} as typeof window.chs;

let originalDate: DateConstructor;

jest.mock("@lookit/data");
jest.mock("jspsych", () => ({
  ...jest.requireActual("jspsych"),
  initJsPsych: jest.fn().mockReturnValue({
    pluginAPI: {
      getCameraRecorder: jest.fn().mockReturnValue({
        addEventListener: jest.fn(),
        mimeType: "video/webm",
        start: jest.fn(),
        stop: jest.fn(),
        stream: {
          active: true,
          clone: jest.fn(),
          getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
        },
      }),
    },
    data: {
      getLastTrialData: jest.fn().mockReturnValue({
        values: jest
          .fn()
          .mockReturnValue([{ trial_type: "test-type", trial_index: 0 }]),
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

afterEach(() => {
  jest.clearAllMocks();
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

  expect(async () => await rec.start(true, "video-consent")).rejects.toThrow(
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

  // Upload the file to s3
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
  const stopPromise = Promise.resolve();

  rec["stopPromise"] = stopPromise;
  rec.insertWebcamFeed(webcam_div);
  expect(document.body.innerHTML).toContain("<video");

  await rec.stop();
  expect(document.body.innerHTML).not.toContain("<video");

  // Reset the document body.
  document.body.innerHTML = "";
});

test("Webcam feed container maintains size with recorder.stop(true)", async () => {
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

  // Mock the return values for the video element's offsetHeight/offsetWidth, which are used to set the container size
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetWidth", "get")
    .mockImplementation(() => 400);
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetHeight", "get")
    .mockImplementation(() => 300);

  await rec.stop(true);

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
  const stopPromise = Promise.resolve();

  rec["stopPromise"] = stopPromise;
  rec.insertWebcamFeed(webcam_div);

  // Mock the return values for the video element offsetHeight/offsetWidth, which are used to set the container size
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetWidth", "get")
    .mockImplementation(() => 400);
  jest
    .spyOn(document.getElementsByTagName("video")[0], "offsetHeight", "get")
    .mockImplementation(() => 300);

  await rec.stop(false);

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

test("Webcam feed container size is not maintained with recorder.stop()", async () => {
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
  jest.spyOn(rec, "insertVideoFeed");

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
