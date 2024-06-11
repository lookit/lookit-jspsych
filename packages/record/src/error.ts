/** Error thrown when recorder is null. */
export class RecorderInitializeError extends Error {
  /**
   * When there isn't a recorder, provide the user with an explanation of what
   * they could do to resolve the issue.
   */
  public constructor() {
    const message = "Neither camera nor microphone has been initialized.";
    super(message);
    this.name = "RecorderInitializeError";
  }
}

/**
 * Error thrown when trying to stop an active session recording that cannot be
 * found.
 */
export class NoSessionRecordingError extends Error {
  /**
   * When trying to stop a recording that isn't found, provide the user with an
   * explanation of what they could do to resolve the issue.
   */
  public constructor() {
    const message =
      "Cannot stop a session recording because no active session recording was found. Maybe it needs to be started, or there was a problem starting the recording.";
    super(message);
    this.name = "NoSessionRecordingError";
  }
}

/**
 * Error thrown when trying to trying to start a recording while another is
 * already active.
 */
export class ExistingRecordingError extends Error {
  /**
   * When trying to start a recording but there is already an active recording
   * in progress, provide the user with an explanation of what they could do to
   * resolve the issue.
   */
  public constructor() {
    const message =
      "Cannot start a new recording because an active recording was found. Maybe a session recording needs to be stopped, trial recording is being used during session recording, or there was a problem stopping a prior recording.";
    super(message);
    this.name = "ExistingRecordingError";
  }
}
