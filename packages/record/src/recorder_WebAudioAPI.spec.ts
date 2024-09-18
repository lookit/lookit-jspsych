/* eslint-disable @typescript-eslint/no-explicit-any */
import { initJsPsych } from "jspsych";
import {
  audioContextMock,
  AudioWorkletNodeMock,
} from "../fixtures/MockWebAudioAPI";
import { MicCheckError } from "./error";
import Recorder from "./recorder";

// Some of the recorder's methods rely on the WebAudio API, which is not available in Node/Jest/jsdom, so we'll mock it here.
// This is in a separate file to avoid polluting the other test environments with the WebAudio API mocks.

global.AudioContext = jest.fn(() => audioContextMock) as any;
global.AudioWorkletNode = AudioWorkletNodeMock as any;

/** Add mock registerProcessor to the global scope. */
global.registerProcessor = () => {};

afterEach(() => {
  jest.clearAllMocks();
});

test("Recorder check mic", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Mock the resolution of the last promise in checkMic so that it resolves and we can check the mocks/spies.
  rec["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());

  const createMediaStreamSourceSpy = jest.spyOn(
    audioContextMock,
    "createMediaStreamSource",
  );
  const addModuleSpy = jest.spyOn(audioContextMock.audioWorklet, "addModule");
  const createConnectProcessorSpy = jest.spyOn(rec, "createConnectProcessor");

  const expectedAudioContext = new AudioContext();
  const expectedMicrophone = expectedAudioContext.createMediaStreamSource(
    rec["stream"],
  );

  await rec.checkMic();

  expect(createMediaStreamSourceSpy).toHaveBeenCalledWith(media.stream);
  expect(addModuleSpy).toHaveBeenCalledWith("/static/js/mic_check.js");
  expect(createConnectProcessorSpy).toHaveBeenCalledWith(
    expectedAudioContext,
    expectedMicrophone,
  );
  expect(rec["setupPortOnMessage"]).toHaveBeenCalledWith(rec["minVolume"]);
});

test("Throws MicCheckError with createConnectProcessor error", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  rec["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await rec.checkMic()).resolves;

  const mockError = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  rec["createConnectProcessor"] = mockError;
  expect(async () => await rec.checkMic()).rejects.toThrow(MicCheckError);
});

test("Throws MicCheckError with addModule error", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  rec["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await rec.checkMic()).resolves;

  const mockError = jest.fn(() => {
    const promise = new Promise(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  audioContextMock.audioWorklet.addModule = mockError;
  expect(async () => await rec.checkMic()).rejects.toThrow(MicCheckError);
});

test("Throws MicCheckError with setupPortOnMessage error", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  // Mock the resolution of the last promise in checkMic to make sure that the rejection/error occurs before this point.
  rec["setupPortOnMessage"] = jest
    .fn()
    .mockReturnValue(() => Promise.resolve());
  expect(async () => await rec.checkMic()).resolves;

  const mockError = jest.fn(() => {
    const promise = new Promise<void>(() => {
      throw "Error";
    });
    promise.catch(() => null); // Prevent an uncaught error here so that it propogates to the catch block.
    return promise;
  });
  rec["setupPortOnMessage"] = mockError;
  expect(async () => await rec.checkMic()).rejects.toThrow(MicCheckError);
});

test("checkMic should process microphone input and handle messages", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  const onMicActivityLevelSpy = jest.spyOn(rec, "onMicActivityLevel" as never);

  expect(rec["processorNode"]).toBe(null);

  // Setup the processor node.
  const audioContext = new AudioContext();
  rec["processorNode"] = new AudioWorkletNode(
    audioContext,
    "mic-check-processor",
  );
  expect(rec["processorNode"]).toBeTruthy();
  rec["setupPortOnMessage"](rec["minVolume"]);
  expect(rec["processorNode"].port.onmessage).toBeTruthy();

  expect(rec.micChecked).toBe(false);

  // Simulate a failing event
  const failVol = 0.0001;
  const mockEventFail = { data: { volume: failVol } } as MessageEvent;
  rec["processorNode"].port.onmessage(mockEventFail);

  // Verify onMicActivityLevel is called with params and micChecked is still false.
  expect(onMicActivityLevelSpy).toHaveBeenCalledWith(
    failVol,
    rec["minVolume"],
    expect.any(Function),
  );
  expect(rec.micChecked).toBe(false);

  // Simulate a passing event
  const passVol = 0.6;
  const mockEventPass = { data: { volume: passVol } } as MessageEvent;
  rec["processorNode"].port.onmessage(mockEventPass);

  // Verify onMicActivityLevel is called with params and micChecked is set to true.
  expect(onMicActivityLevelSpy).toHaveBeenCalledWith(
    passVol,
    rec["minVolume"],
    expect.any(Function),
  );
  expect(rec.micChecked).toBe(true);
});

test("Destroy method should set processorNode to null", async () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  expect(rec["processorNode"]).toBe(null);

  // Setup the processor node.
  const audioContext = new AudioContext();
  rec["processorNode"] = new AudioWorkletNode(
    audioContext,
    "mic-check-processor",
  );
  expect(rec["processorNode"]).toBeTruthy();
  rec["setupPortOnMessage"](rec["minVolume"]);
  expect(rec["processorNode"].port.onmessage).toBeTruthy();

  expect(rec["processorNode"]).toBeTruthy();
  await rec.destroy();
  expect(rec["processorNode"]).toBe(null);
});

test("Recorder setupPortOnMessage should setup port's on message callback", () => {
  const jsPsych = initJsPsych();
  const rec = new Recorder(jsPsych, "prefix");
  const media = {
    stop: jest.fn(),
    stream: { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) },
  };
  jsPsych.pluginAPI.getCameraRecorder = jest.fn().mockReturnValue(media);

  expect(rec["processorNode"]).toBe(null);

  // Setup the processor node.
  const audioContext = new AudioContext();
  rec["processorNode"] = new AudioWorkletNode(
    audioContext,
    "mic-check-processor",
  );
  expect(rec["processorNode"]).toBeTruthy();

  rec["onMicActivityLevel"] = jest.fn();

  rec["setupPortOnMessage"](rec["minVolume"]);
  expect(rec["processorNode"].port.onmessage).toBeTruthy();

  // Simulate a message event to test the message event callback.
  const passVol = 0.6;
  const mockEventPass = { data: { volume: passVol } } as MessageEvent;
  rec["processorNode"].port.onmessage(mockEventPass);

  // The port message event should trigger onMicActivityLevel.
  expect(rec["onMicActivityLevel"]).toHaveBeenCalledWith(
    passVol,
    rec["minVolume"],
    expect.any(Function),
  );
});
