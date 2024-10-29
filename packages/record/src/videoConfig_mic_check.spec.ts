/* eslint-disable @typescript-eslint/no-explicit-any */
import { initJsPsych, JsPsych } from "jspsych";
import {
  audioContextMock,
  AudioWorkletNodeMock,
} from "../fixtures/MockWebAudioAPI";
import { MicCheckError, NoStreamError } from "./errors";
import VideoConfigPlugin from "./videoConfig";

// The video config mic check relies on the WebAudio API, which is not available in Node/Jest/jsdom, so we'll mock it here.
// This is in a separate file to avoid polluting the other test environments with the WebAudio API mocks.

global.AudioContext = jest.fn(() => audioContextMock) as any;
global.AudioWorkletNode = AudioWorkletNodeMock as any;

/** Add mock registerProcessor to the global scope. */
global.registerProcessor = () => {};

jest.mock("jspsych", () => ({
  ...jest.requireActual("jspsych"),
  initJsPsych: jest.fn().mockReturnValue({
    pluginAPI: {
      getCameraStream: jest.fn().mockReturnValue({
        active: true,
        clone: jest.fn(),
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
      }),
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

let display_el: HTMLBodyElement;
let jsPsych: JsPsych;
let video_config: VideoConfigPlugin;

beforeEach(() => {
  jsPsych = initJsPsych();
  display_el = document.getElementsByTagName("body")[0] as HTMLBodyElement;
  video_config = new VideoConfigPlugin(jsPsych);
  video_config["display_el"] = display_el;
});

afterEach(() => {
  jest.clearAllMocks();
});

test("Video config check mic", async () => {
  video_config["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());

  const createMediaStreamSourceSpy = jest.spyOn(
    audioContextMock,
    "createMediaStreamSource",
  );
  const addModuleSpy = jest.spyOn(audioContextMock.audioWorklet, "addModule");
  const createConnectProcessorSpy = jest.spyOn(
    video_config,
    "createConnectProcessor",
  );

  const expectedAudioContext = new AudioContext();
  const expectedMicrophone = expectedAudioContext.createMediaStreamSource(
    jsPsych.pluginAPI.getCameraStream(),
  );

  await video_config["checkMic"]();

  expect(createMediaStreamSourceSpy).toHaveBeenCalledWith(
    jsPsych.pluginAPI.getCameraStream(),
  );
  expect(addModuleSpy).toHaveBeenCalledWith("/static/js/mic_check.js");
  expect(createConnectProcessorSpy).toHaveBeenCalledWith(
    expectedAudioContext,
    expectedMicrophone,
  );
  expect(video_config["setupPortOnMessage"]).toHaveBeenCalledWith(
    video_config["minVolume"],
  );
});

test("Throws MicCheckError with createConnectProcessor error", () => {
  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  video_config["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await video_config["checkMic"]()).resolves;

  // No error message
  const mockError = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  video_config["createConnectProcessor"] = mockError;
  expect(async () => await video_config["checkMic"]()).rejects.toThrow(
    MicCheckError,
  );

  const mockErrorMsg = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw new Error("This is an error message");
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  video_config["createConnectProcessor"] = mockErrorMsg;
  expect(async () => await video_config["checkMic"]()).rejects.toThrow(
    MicCheckError,
  );
});

test("Throws MicCheckError with addModule error", () => {
  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  video_config["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await video_config["checkMic"]()).resolves;

  const mockError = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  audioContextMock.audioWorklet.addModule = mockError;
  expect(async () => await video_config["checkMic"]()).rejects.toThrow(
    MicCheckError,
  );
});

test("Throws MicCheckError with setupPortOnMessage error", () => {
  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  video_config["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await video_config.checkMic()).resolves;

  const mockError = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  video_config["setupPortOnMessage"] = mockError;
  expect(async () => await video_config["checkMic"]()).rejects.toThrow(
    MicCheckError,
  );
});

test("checkMic should process microphone input and handle messages", () => {
  const onMicActivityLevelSpy = jest.spyOn(
    video_config,
    "onMicActivityLevel" as never,
  );

  expect(video_config["processorNode"]).toBe(null);

  // Setup the processor node.
  const audioContext = new AudioContext();
  video_config["processorNode"] = new AudioWorkletNode(
    audioContext,
    "mic-check-processor",
  );
  expect(video_config["processorNode"]).not.toBeNull();
  video_config["setupPortOnMessage"](video_config["minVolume"]);
  expect(video_config["processorNode"].port.onmessage).toBeTruthy();

  expect(video_config["micChecked"]).toBe(false);

  // Simulate a failing event
  const failVol = 0.0001;
  const mockEventFail = { data: { volume: failVol } } as MessageEvent;
  if (
    video_config["processorNode"] &&
    video_config["processorNode"].port &&
    video_config["processorNode"].port.onmessage
  ) {
    video_config["processorNode"].port.onmessage(mockEventFail);
  }

  // Verify onMicActivityLevel is called with params and micChecked is still false.
  expect(onMicActivityLevelSpy).toHaveBeenCalledWith(
    failVol,
    video_config["minVolume"],
    expect.any(Function),
  );
  expect(video_config["micChecked"]).toBe(false);

  // Simulate a passing event
  const passVol = 0.6;
  const mockEventPass = { data: { volume: passVol } } as MessageEvent;
  if (
    video_config["processorNode"] &&
    video_config["processorNode"].port &&
    video_config["processorNode"].port.onmessage
  ) {
    video_config["processorNode"].port.onmessage(mockEventPass);
  }

  // Verify onMicActivityLevel is called with params and micChecked is set to true.
  expect(onMicActivityLevelSpy).toHaveBeenCalledWith(
    passVol,
    video_config["minVolume"],
    expect.any(Function),
  );
  expect(video_config["micChecked"]).toBe(true);
});

test("Recorder setupPortOnMessage should setup port's on message callback", () => {
  expect(video_config["processorNode"]).toBe(null);

  // Setup the processor node.
  const audioContext = new AudioContext();
  video_config["processorNode"] = new AudioWorkletNode(
    audioContext,
    "mic-check-processor",
  );
  expect(video_config["processorNode"]).toBeTruthy();

  video_config["onMicActivityLevel"] = jest.fn();

  video_config["setupPortOnMessage"](video_config["minVolume"]);
  expect(video_config["processorNode"].port.onmessage).toBeTruthy();

  // Simulate a message event to test the message event callback.
  const passVol = 0.6;
  const mockEventPass = { data: { volume: passVol } } as MessageEvent;
  if (
    video_config["processorNode"] &&
    video_config["processorNode"].port &&
    video_config["processorNode"].port.onmessage
  ) {
    video_config["processorNode"].port.onmessage(mockEventPass);
  }

  // The port message event should trigger onMicActivityLevel.
  expect(video_config["onMicActivityLevel"]).toHaveBeenCalledWith(
    passVol,
    video_config["minVolume"],
    expect.any(Function),
  );
});

test("Video config mic check throws error if no stream", () => {
  const getCameraStreamSpy = jest
    .spyOn(jsPsych.pluginAPI, "getCameraStream")
    .mockImplementation(jest.fn().mockReturnValue(null));

  expect(async () => {
    await video_config["checkMic"]();
  }).rejects.toThrow(NoStreamError);
  expect(getCameraStreamSpy).toHaveBeenCalledTimes(1);
});
