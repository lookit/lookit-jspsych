import image from "@rollup/plugin-image";
import dotenv from "rollup-plugin-dotenv";
import { importAsString } from "rollup-plugin-string-import";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsRecord").map((config) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Add support for .env files
      dotenv(),
      // Add support to import mustache template files as strings
      importAsString({
        include: ["**/*.mustache"],
      }),
      image(),
    ],
  };
});
