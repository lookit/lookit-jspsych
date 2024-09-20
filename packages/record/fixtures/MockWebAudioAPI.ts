/* eslint-disable @typescript-eslint/no-explicit-any */

/** Mock the message port, which is needed by the Audio Worklet Processor. */
export const msgPort = {
  addEventListener: jest.fn(),
  start: jest.fn(),
  close: jest.fn(),
  postMessage: jest.fn(),
  // eslint-disable-next-line jsdoc/require-jsdoc
  onmessage: jest.fn(),
} as unknown as MessagePort;

/** Mock for Media Stream Audio Source Node. */
export class MediaStreamAudioSourceNodeMock {
  /**
   * Mock the MediaStreamAudioSourceNode.
   *
   * @param _destination - Destination
   * @returns This
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public connect(_destination: any): any {
    // Return this to support chaining
    return this;
  }
}

/** Mock for Audio Worklet Node */
export class AudioWorkletNodeMock {
  /**
   * Constructor.
   *
   * @param _context - Base audio context
   * @param _name - Name
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public constructor(_context: any, _name: string) {
    this.port = msgPort;
  }
  public port: MessagePort;
  /**
   * Connect.
   *
   * @param _destination - Destination
   * @returns This
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public connect(_destination: any): any {
    return this;
  }
}

// Define a partial mock for the AudioContext
export const audioContextMock = {
  audioWorklet: {
    addModule: jest.fn(async () => await Promise.resolve()),
  },
  createBuffer: jest.fn(
    () =>
      ({
        getChannelData: jest.fn(() => new Float32Array(256)),
      }) as unknown as AudioBuffer,
  ),
  createBufferSource: jest.fn(
    () =>
      ({
        connect: jest.fn(),
      }) as unknown as AudioBufferSourceNode,
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createMediaStreamSource: jest.fn(
    (_stream: MediaStream) => new MediaStreamAudioSourceNodeMock(),
  ),
  sampleRate: 44100,
  destination: new AudioWorkletNodeMock(null, ""), // Mock destination
  close: jest.fn(),
  decodeAudioData: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn(),
  state: "suspended",
  onstatechange: null as any,
} as unknown as AudioContext; // Cast as AudioContext for compatibility
