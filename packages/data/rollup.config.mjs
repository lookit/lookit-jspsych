import { makeRollupConfig } from "@jspsych/config/rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const config = makeRollupConfig("chsData");

config.map((c) => {
  c.plugins = [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    ...c.plugins,
  ];
});

export default config;
