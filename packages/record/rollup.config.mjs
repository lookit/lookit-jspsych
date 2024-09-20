//import copy from "rollup-plugin-copy";
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
      // copy({
      //   targets: [{ src: "src/mic_check.js", dest: "dist" }],
      // }),
      // Add support to import mustache template files as strings
      importAsString({
        include: ["**/*.mustache"],
      }),
      image(),
    ],
  };
});
