import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";
import { iifeNameData } from "./packages/data/rollup.config.mjs";

export function makeRollupConfig(iifeName) {
  const dataPackageName = "@lookit/data";
  return jsPsychMakeRollupConfig(iifeName).map((config) => {
    return {
      ...config,
      // Add data package as external dependency
      external: [...config.external, dataPackageName],
      output: config.output.map((output) => {
        return {
          ...output,
          globals: {
            ...output.globals,
            // Explicitly state data's iife name
            [dataPackageName]: iifeNameData,
          },
        };
      }),
    };
  });
}
