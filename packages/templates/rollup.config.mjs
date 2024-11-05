import { nodeResolve } from "@rollup/plugin-node-resolve";
import dotenv from "rollup-plugin-dotenv";
import { importAsString } from "rollup-plugin-string-import";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsTemplates").map((config) => {
  return {
    ...config,
    plugins: [
      // Handlebars requires node polyfills.
      nodeResolve({ browser: true, preferBuiltins: false }),
      ...config.plugins,
      // // Add support for .env files
      dotenv({ cwd: "../../" }),
      // // Add support to import yaml and handlebars files as strings
      importAsString({
        include: ["**/*.yaml", "**/*.hbs"],
      }),
    ],
  };
});
