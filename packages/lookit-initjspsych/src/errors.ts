/**
 * Needed to tell user that their nth trial was undefined.
 * https://stackoverflow.com/a/39466341
 *
 * @param n - Number needing suffix
 * @returns Number with ordinal suffix
 */
export const nth = (n: number) => {
  return `${n}${["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] || "th"}`;
};

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
