/** Error thrown when trial is expecting locale parameter and on is not found. */
export class TrialLocaleParameterUnset extends Error {
  /** This will show when the locale is not set in a trial. */
  public constructor() {
    super("Locale not set in trial parameters.");
  }
}
