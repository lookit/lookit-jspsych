import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";
import { iifeNameData } from "./packages/data/rollup.config.mjs";

export function makeRollupConfig(iifeName) {
  return jsPsychMakeRollupConfig(iifeName).map((config) => {
    return {
      ...config,
      // Add data package as external dependency
      external: [...config.external, "@lookit/data"],
      output: config.output
        // Only build iife bundles
        .filter((output) => output.format === "iife")
        .map((output) => {
          return {
            ...output,
            globals: {
              ...output.globals,
              // Explicitly state data's iife name
              "@lookit/data": iifeNameData,
            },
          };
        }),
    };
  });
}
