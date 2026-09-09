declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** Sentry DSN. When unset/empty, Sentry is not initialized. */
      SENTRY_DSN?: string;
      /**
       * Sentry environment name, currently always 'production'. We can split by
       * staging/production later via runtime hostname detection.
       */
      SENTRY_ENVIRONMENT?: string;
      /** Sentry release identifier (e.g. a version or git SHA). */
      SENTRY_RELEASE?: string;
    }
  }

  /**
   * Minimal declaration of the `process.env` we reference in source. These
   * references are substituted at build time (see rollup.config.mjs: dotenv +
   * rollup/plugin-replace), so no `process` object actually exists in the
   * browser bundle. We deliberately do NOT depend on @types/node — that would
   * declare a full Node runtime as globally available, which is misleading for
   * a browser package. Instead we declare only the small surface we use.
   */
  const process: { env: NodeJS.ProcessEnv };
}

export {};
