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

/**
 * Error thrown when trying to to stop the recorder and the stop promise doesn't
 * exist.
 */
export class NoStopPromiseError extends Error {
  /**
   * When attempting to stop a recording but there's no stop promise to ensure
   * the stop has completed.
   */
  public constructor() {
    const message =
      "There is no Stop Promise, which means the recorder wasn't started properly.";
    super(message);
    this.name = "NoStopPromiseError";
  }
}

/**
 * Error thrown when attempting an action that relies on an input stream, such
 * as the mic volume check, but no such stream is found.
 */
export class NoStreamError extends Error {
  /**
   * When attempting an action that requires an input stream, such as the mic
   * check, but no stream is found.
   */
  public constructor() {
    const message =
      "No input stream found. Maybe the recorder was not initialized with intializeRecorder.";
    super(message);
    this.name = "NoStreamError";
  }
}

/**
 * Error thrown if there's a problem setting up the microphone input level
 * check.
 */
export class MicCheckError extends Error {
  /**
   * Occurs if there's a problem setting up the mic check, including setting up
   * the audio context and stream source, loading the audio worklet processor
   * script, setting up the port message event handler, and resolving the
   * promise chain via message events passed to onMicActivityLevel.
   *
   * @param err - Error passed into this error that is thrown in the catch
   *   block, if any.
   */
  public constructor(err: Error) {
    const message = `There was a problem setting up and running the microphone check. ${err.message}`;
    super(message);
    this.name = "MicCheckError";
  }
}
