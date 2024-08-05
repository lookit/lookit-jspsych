import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";

export function makeRollupConfig(iifeName) {
  const dataPackageName = "@lookit/data";
  const dataPackageIifeName = "chsData";
  const recordPackageName = "@lookit/record";
  const recordPackageIifeName = "chsRecord";

  return jsPsychMakeRollupConfig(iifeName).map((config) => {
    return {
      ...config,
      // Add data package as external dependency
      external: [...config.external, dataPackageName, recordPackageName],
      output: config.output
        // Only build iife bundles
        .filter((output) => output.format === "iife")
        .map((output) => {
          return {
            ...output,
            globals: {
              ...output.globals,
              // Explicitly state data's iife name
              [dataPackageName]: dataPackageIifeName,
              [recordPackageName]: recordPackageIifeName,
            },
          };
        }),
    };
  });
}
