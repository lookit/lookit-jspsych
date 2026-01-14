/**
 * Helper function for setting up a timeout on a promise.
 *
 * @param promise - Promise to be raced with the timeout.
 * @param timeoutMs - Timeout duration, in milliseconds.
 * @param onTimeoutCleanup - Callback function that should fire if the timeout
 *   duration is reached.
 * @returns The first promise that is resolved, either the promise that we're
 *   actually awaiting (awaitPromise) or the timeout.
 */
export const promiseWithTimeout = <T>(
  promise: Promise<T>,
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
      if (value !== "timeout") {
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
