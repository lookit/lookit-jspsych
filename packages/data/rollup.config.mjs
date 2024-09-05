import { nodeResolve } from "@rollup/plugin-node-resolve";
import dotenv from "rollup-plugin-dotenv";
import { makeRollupConfig } from "../../rollup.mjs";

export const iifeNameData = "chsData";

export default makeRollupConfig(iifeNameData).map((config) => {
  return {
    ...config,
    plugins: [
      // Resolve node dependencies to be used in a browser.
      nodeResolve({ browser: true, preferBuiltins: false }),
      // Add support for .env files
      dotenv(),
      ...config.plugins,
    ],
  };
});
