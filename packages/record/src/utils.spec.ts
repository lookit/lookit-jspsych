import { LookitWindow } from "@lookit/data/dist/types";
import { ageInYears, captureError, promiseWithTimeout } from "./utils";

declare const window: LookitWindow;

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

describe("ageInYears", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns correct age when birthday has already passed this year", () => {
    jest.setSystemTime(new Date(2026, 5, 15)); // June 15, 2026
    const dob = new Date(2020, 4, 10); // May 10, 2020 — birthday passed
    expect(ageInYears(dob)).toBe(6);
  });

  test("returns correct age when birthday has not yet occurred this year", () => {
    jest.setSystemTime(new Date(2026, 5, 15)); // June 15, 2026
    const dob = new Date(2020, 6, 10); // July 10, 2020 — birthday upcoming
    expect(ageInYears(dob)).toBe(5);
  });

  test("returns correct age on the birthday itself", () => {
    jest.setSystemTime(new Date(2026, 5, 15)); // June 15, 2026
    const dob = new Date(2020, 5, 15); // June 15, 2020 — today is their birthday
    expect(ageInYears(dob)).toBe(6);
  });
});

describe("captureError", () => {
  afterEach(() => {
    delete (window as Partial<LookitWindow>).chs;
  });

  test("reports the error through window.chs.captureError", () => {
    const capture = jest.fn();
    window.chs = { captureError: capture } as unknown as LookitWindow["chs"];
    const error = new Error("boom");

    captureError(error, "some_context");

    expect(capture).toHaveBeenCalledWith(error, "some_context", undefined);
  });

  test("passes extra data through to window.chs.captureError", () => {
    const capture = jest.fn();
    window.chs = { captureError: capture } as unknown as LookitWindow["chs"];
    const error = new Error("boom");

    captureError(error, "some_context", { filename: "fakename" });

    expect(capture).toHaveBeenCalledWith(error, "some_context", {
      filename: "fakename",
    });
  });

  test("does nothing when error reporting is not available", () => {
    // e.g. preview sessions, where Sentry is not initialized.
    window.chs = {} as unknown as LookitWindow["chs"];
    expect(() => captureError(new Error("boom"), "some_context")).not.toThrow();

    // e.g. window.chs not loaded.
    delete (window as Partial<LookitWindow>).chs;
    expect(() => captureError(new Error("boom"), "some_context")).not.toThrow();
  });
});
