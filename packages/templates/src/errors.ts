/** Error throw what specified language isn't found */
export class TranslationNotFoundError extends Error {
  /**
   * This will be thrown when attempting to init i18n
   *
   * @param baseName - Language a2code with region
   */
  public constructor(baseName: string) {
    super(`"${baseName}" translation not found.`);
  }
}
/** Error thrown when researcher selects template that isn't available. */
export class ConsentTemplateNotFound extends Error {
  /**
   * This will let the researcher know that their template isn't found.
   *
   * @param template - Supplied name of consent template.
   */
  public constructor(template: string) {
    super(`Consent template "${template}" not found.`);
  }
}
