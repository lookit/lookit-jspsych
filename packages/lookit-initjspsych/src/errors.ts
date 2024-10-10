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
