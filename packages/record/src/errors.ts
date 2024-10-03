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

/** Error thrown when stream is inactive and recorder is started. */
export class StreamInactiveInitializeError extends Error {
  /**
   * Error check on initialize. Attempting to validate recorder is ready to
   * start recording.
   */
  public constructor() {
    super(
      "Stream is inactive when attempting to start recording.  Recorder reset might be needed.",
    );
    this.name = "StreamInactiveInitializeError";
  }
}

/** Error thrown when stream data is available and recorder is started. */
export class StreamDataInitializeError extends Error {
  /**
   * Error check on recorder initialize. Attempt to validate recorder data array
   * is empty and ready to start recording.
   */
  public constructor() {
    super(
      "Stream data from another recording still available when attempting to start recording.  Recorder reset might be needed. ",
    );
    this.name = "StreamDataInitializeError";
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
      "No input stream found. Maybe the recorder was not initialized with initializeRecorder.";
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
   *   block, if any. Errors passed to catch blocks must have type unknown.
   */
  public constructor(err: unknown) {
    let message = `There was a problem setting up and running the microphone check.`;
    if (
      err instanceof Object &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      message += ` ${err.message}`;
    }
    if (typeof err === "string") {
      message += ` ${err}`;
    }
    super(message);
    this.name = "MicCheckError";
  }
}

/**
 * Error thrown when attempting to access S3 object and it's, unknowingly,
 * undefined.
 */
export class S3UndefinedError extends Error {
  /**
   * Provide feed back when recorder attempts to use S3 object and it's
   * undefined.
   */
  public constructor() {
    super("S3 object is undefined.");
    this.name = "S3UndefinedError";
  }
}

/**
 * Error thrown when attempting to reset recorder, but its stream is still
 * active.
 */
export class StreamActiveOnResetError extends Error {
  /**
   * This error will be thrown when developer attempts to reset recorder while
   * active.
   */
  public constructor() {
    super("Won't reset recorder. Stream is still active.");
    this.name = "StreamActiveOnResetError";
  }
}

/** Error thrown when attempting to select webcam element and it's not found. */
export class NoWebCamElementError extends Error {
  /**
   * Error thrown when attempting to retrieve webcam element and it's not in the
   * DOM.
   */
  public constructor() {
    super("No webcam element found.");
    this.name = "NoWebCamElementError";
  }
}
/** Error thrown when playback element wasn't found in the DOM. */
export class NoPlayBackElementError extends Error {
  /**
   * This error will be thrown when attempting to retrieve the playback element
   * and it wasn't found in the DOM.
   */
  public constructor() {
    super("No playback element found.");
    this.name = "NoPlayBackElementError";
  }
}
/**
 * Error thrown when attempting to create playback/download url and data array
 * is empty.
 */
export class CreateURLError extends Error {
  /**
   * Throw this error when data array is empty and url still needs to be
   * created. Sometimes this means the "reset()" method was called too early.
   */
  public constructor() {
    super("Video/audio URL couldn't be created.  No data available.");
    this.name = "CreateURLError";
  }
}

/** Error thrown when video container couldn't be found. */
export class VideoContainerNotFoundError extends Error {
  /** No video container found. */
  public constructor() {
    super("Video Container could not be found.");
    this.name = "VideoContainerError";
  }
}

/** Error thrown when button not found. */
export class ButtonNotFoundError extends Error {
  /**
   * Button couldn't be found by ID field.
   *
   * @param id - HTML ID parameter.
   */
  public constructor(id: string) {
    super(`"${id}" button not found.`);
    this.name = "ButtonNotFoundError";
  }
}

/** Throw Error when image couldn't be found. */
export class ImageNotFoundError extends Error {
  /**
   * Error when image couldn't be found by ID field.
   *
   * @param id - HTML ID parameter
   */
  public constructor(id: string) {
    super(`"${id}" image not found.`);
  }
}
