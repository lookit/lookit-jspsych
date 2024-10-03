import { nth } from "./utils";

/** Error when experiment data doesn't contain values on finish. */
export class SequenceExpDataError extends Error {
  /** Error when experiment data doesn't contain values on finish. */
  public constructor() {
    super("Experiment sequence or data missing.");
    this.name = "SequenceExpDataError";
  }
}
/** When a trial is accidentally undefined. */
export class UndefinedTypeError extends Error {
  /**
   * Inform user that their nth trial is undefined.
   *
   * @param idx - Index of timeline where trial type is undefined
   */
  public constructor(idx: number) {
    super(
      `${nth(idx + 1)} trial has an undefined type.  Maybe the type name is misspelled.`,
    );
  }
}
