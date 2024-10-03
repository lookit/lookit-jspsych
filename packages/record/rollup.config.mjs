import image from "@rollup/plugin-image";
import replace from "@rollup/plugin-replace";
import dotenv from "rollup-plugin-dotenv";
import nodePolyfills from "rollup-plugin-polyfill-node";
import { importAsString } from "rollup-plugin-string-import";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsRecord").map((config) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Add support for .env files
      dotenv(),
      // Add support to import mustache, yaml, handlebars files as strings
      importAsString({
        include: ["**/*.mustache", "**/*.yaml", "**/*.hbs"],
      }),
      // Images are converted to base64
      image(),
      replace({
        values: {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        preventAssignment: true,
      }),
      // Handlebars requires node polyfills.
      nodePolyfills(),
    ],
  };
});
