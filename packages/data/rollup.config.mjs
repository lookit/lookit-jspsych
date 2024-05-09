import { makeRollupConfig } from "@jspsych/config/rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dotenv from "rollup-plugin-dotenv";

const config = makeRollupConfig("chsData");

config.map((c) => {
  c.plugins = [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    dotenv(),
    ...c.plugins,
  ];
});

export default config;
