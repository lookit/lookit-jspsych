import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsData").map((config) => {
  // TODO: minify is not working.
  return {
    ...config,
    plugins: [
      typescript(),
      nodeResolve({ browser: true, preferBuiltins: false }),
      json(),
      commonjs(),
    ],
  };
});
