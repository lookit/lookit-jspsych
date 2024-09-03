import { nodeResolve } from "@rollup/plugin-node-resolve";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsVideoConfig").map((config) => {
  return {
    ...config,
    plugins: [
      // Resolve node dependencies to be used in a browser.
      nodeResolve({ browser: true, preferBuiltins: false }),
      ...config.plugins,
    ],
  };
});
