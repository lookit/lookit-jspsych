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
