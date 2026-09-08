import image from "@rollup/plugin-image";
import replace from "@rollup/plugin-replace";
import dotenv from "rollup-plugin-dotenv";
import nodePolyfills from "rollup-plugin-polyfill-node";
import { string } from "rollup-plugin-string";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsRecord").map((config) => {
  return {
    ...config,
    plugins: [
      // Handlebars requires node polyfills.
      nodePolyfills(),
      ...config.plugins,
      // Add support for .env files
      dotenv({ cwd: "../../" }),
      // Add support to import yaml and handlebars files as strings
      string({
        include: ["**/*.yaml", "**/*.hbs"],
      }),
      // Images are converted to base64
      image(),
      // Unlike lookit-initjspsych, this package doesn't need to set per-env-variable
      // fallbacks (e.g. for the Sentry vars) because (a) it doesn't reference Sentry vars,
      // and (b) nodePolyfills() above provides a `process` shim, so any process.env.*
      // reference that dotenv didn't replace resolves to undefined at runtime
      // instead of throwing "process is not defined". NODE_ENV is still pinned
      // to "production" so libraries can dead-code-eliminate their dev branches.
      replace({
        values: {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        preventAssignment: true,
      }),
    ],
  };
});
