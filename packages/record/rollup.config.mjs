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
      replace({
        values: {
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        preventAssignment: true,
      }),
    ],
  };
});
