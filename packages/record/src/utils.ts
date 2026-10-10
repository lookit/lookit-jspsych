import { LookitWindow } from "@lookit/data/dist/types";

declare const window: LookitWindow;

/**
 * Report an error to Sentry through the capture function that
 * lookit-initjspsych exposes on window.chs. Does nothing when that function
 * isn't set: preview sessions, builds without a Sentry DSN, or experiments not
 * run through lookit-initjspsych.
 *
 * @param error - The error to report.
 * @param context - Short label for where the error occurred, e.g.
 *   "recording_upload_failed".
 * @param extra - Optional extra data to attach to the event, e.g. { filename }.
 *   Keep values that vary between events here rather than in the error message,
 *   so that events group into a single Sentry issue.
 */
export const captureError = (
  error: unknown,
  context: string,
  extra?: Record<string, unknown>,
) => {
  window.chs?.captureError?.(error, context, extra);
};

/**
 * Helper function for setting up a timeout on a promise.
 *
 * @param promise - Promise to be raced with the timeout.
 * @param promiseId - String with an identifier for the promise being raced
 *   against the timeout.
 * @param timeoutMs - Timeout duration, in milliseconds.
 * @param onTimeoutCleanup - Callback function that should fire if the timeout
 *   duration is reached.
 * @returns The first promise that is resolved, either the promise that we're
 *   actually awaiting (awaitPromise) or the timeout.
 */
export const promiseWithTimeout = <T>(
  promise: Promise<T>,
  promiseId: string,
  timeoutMs: number,
  onTimeoutCleanup?: () => void,
): Promise<T | string> => {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T | string>((resolve) => {
    timeoutHandle = setTimeout(() => {
      onTimeoutCleanup?.();
      resolve("timeout");
    }, timeoutMs);
  });

  // Return *immediately* a race promise.
  // No async/await — so this function synchronously produces the final promise.
  return Promise.race([promise, timeout]).then(
    (value) => {
      if (value == "timeout") {
        console.log(`Upload for ${promiseId} timed out.`);
      } else {
        console.log(`Upload for ${promiseId} completed.`);
        clearTimeout(timeoutHandle);
      }
      return value;
    },
    (err) => {
      clearTimeout(timeoutHandle);
      throw err;
    },
  );
};

/**
 * Get a child's current age in years using their date of birth.
 *
 * @param childDOB - The child's date of birth, as a date object.
 * @returns - Age in years (number)
 */
export const ageInYears = (childDOB: Date) => {
  const today = new Date();
  let beforeBirthday = 0;
  if (
    today.getMonth() < childDOB.getMonth() ||
    (today.getMonth() == childDOB.getMonth() &&
      today.getDate() < childDOB.getDate())
  ) {
    beforeBirthday = 1;
  }
  return today.getFullYear() - childDOB.getFullYear() - beforeBirthday;
};
