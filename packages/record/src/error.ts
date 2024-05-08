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
