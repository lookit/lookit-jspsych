import Data from "@lookit/data";
import { initJsPsych } from "jspsych";
import { NoStopPromiseError, RecorderInitializeError } from "./error";
import Recorder from "./recorder";

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
