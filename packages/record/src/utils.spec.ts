import { promiseWithTimeout } from "./utils";

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

beforeEach(() => {
  jest.useRealTimers();
  // Hide the console output during tests. Tests can still assert on these spies to check console calls.
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();

  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("Promise with timeout: promise wins", async () => {
  // clears the timeout handle
  const promise = Promise.resolve("url");
  const timeout_handler = jest.fn();

  const promiseRace = promiseWithTimeout(
    promise,
    "promiseId",
    10,
    timeout_handler,
  );

  // returns the promise race
  expect(promiseRace).toBeInstanceOf(Promise);

  await promiseRace;

  expect(promise).resolves;
  expect(timeout_handler).not.toHaveBeenCalled();
  expect(consoleLogSpy).toHaveBeenCalledWith("Upload for promiseId completed.");
});

test("Promise with timeout: promise wins and no timeout callback", async () => {
  // clears the timeout handle
  const promise = Promise.resolve("url");

  const promiseRace = promiseWithTimeout(promise, "promiseId", 10);

  // returns the promise race
  expect(promiseRace).toBeInstanceOf(Promise);

  await promiseRace;

  expect(promise).resolves;
  expect(consoleLogSpy).toHaveBeenCalledWith("Upload for promiseId completed.");
});

test("Promise with timeout: timeout wins", async () => {
  jest.useFakeTimers();

  // promise we're waiting for never resolves
  const promise = new Promise<void>(() => {});

  const timeout_handler = jest.fn();

  const promiseRace = promiseWithTimeout(
    promise,
    "promiseId",
    10,
    timeout_handler,
  );
  // attach a catch that swallows the error, to prevent a Node unhandled rejection error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  promiseRace.catch((err) => {});

  // returns the promise race
  expect(promiseRace).toBeInstanceOf(Promise);

  // advance fake timers so that the timeout triggers
  await jest.advanceTimersByTimeAsync(11);

  // timeout wins
  await expect(promiseRace).resolves.toBe("timeout");

  // flush microtask queue (where the timeout handler and promise rejection occur)
  await Promise.resolve();

  // calls the timeout handler
  expect(timeout_handler).toHaveBeenCalledTimes(1);
});

test("Promise with timeout: timeout wins without callback", async () => {
  jest.useFakeTimers();

  // promise we're waiting for never resolves
  const promise = new Promise<void>(() => {});

  const promiseRace = promiseWithTimeout(promise, "promiseId", 10);
  // attach a catch that swallows the error, to prevent a Node unhandled rejection error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  promiseRace.catch((err) => {});

  // returns the promise race
  expect(promiseRace).toBeInstanceOf(Promise);

  // advance fake timers so that the timeout triggers
  await jest.advanceTimersByTimeAsync(11);

  // flush microtask queue (where the timeout handler and promise rejection occur)
  await Promise.resolve();

  // timeout wins
  await expect(promiseRace).resolves.toBe("timeout");
});
