/** Error when experiment data doesn't contain values on finish. */
export class SequenceExpDataError extends Error {
  /** Error when experiment data doesn't contain values on finish. */
  public constructor() {
    super("Experiment sequence or data missing.");
    this.name = "SequenceExpDataError";
  }
}

/** When a trial type is accidentally undefined. */
export class UndefinedTypeError extends Error {
  /**
   * Inform user that one of their timeline trial objects is missing the type
   * parameter.
   *
   * @param object - Timeline object with a type key whose value is
   *   null/undefined.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(object: Record<string, any>) {
    super(
      `A trial object in the timeline has an undefined type. Maybe the type name is misspelled, or the plugin you want to use is not supported. Object: ${JSON.stringify(object)}.`,
    );
  }
}

/** When a timeline element is incorrectly formatted. */
export class UndefinedTimelineError extends Error {
  /**
   * Inform user that one of the elements on their timeline is formatted
   * incorrectly.
   *
   * @param el - Element in the timeline. Likely a timeline node with an
   *   incorrect timeline value, or trial object with missing type key/value.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(el: any) {
    super(
      `An element in the timeline is not structured correctly or is missing required information. It may be a timeline node with a timeline array that is the wrong type or missing/undefined, or a trial object with a missing type. Element: ${JSON.stringify(el)}`,
    );
  }
}
