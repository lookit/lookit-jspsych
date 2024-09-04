/** Error when experiment data doesn't contain values on finish. */
export class SequenceExpDataError extends Error {
  /** Error when experiment data doesn't contain values on finish. */
  public constructor() {
    super("Experiment sequence or data missing.");
    this.name = "SequenceExpDataError";
  }
}
