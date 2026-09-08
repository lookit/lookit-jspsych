import replace from "@rollup/plugin-replace";
import dotenv from "rollup-plugin-dotenv";
import { makeRollupConfig } from "../../rollup.mjs";

// This package name needs to be unique
export default makeRollupConfig("chsInitJsPsych").map((config) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Add support for .env files.
      // Bakes the Sentry DSN/environment/release from .env into the build.
      dotenv({ cwd: "../../" }),
      // Unlike the record package, this package is not built with node
      // polyfills, so a `process.env.*` reference left in the browser bundle
      // would throw "process is not defined" at runtime. dotenv only replaces
      // keys listed in .env, so here we need the explicit replacement of fallbacks
      // for Sentry vars (and NODE_ENV, which @sentry/browser references) in case they
      // are absent from the build environment. This needs to run after dotenv so that
      // real values from .env take precedence and only unreplaced references
      // fall back here.
      replace({
        preventAssignment: true,
        values: {
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.env.SENTRY_DSN": JSON.stringify(""),
          "process.env.SENTRY_ENVIRONMENT": JSON.stringify(""),
          "process.env.SENTRY_RELEASE": JSON.stringify(""),
        },
      }),
    ],
  };
});
