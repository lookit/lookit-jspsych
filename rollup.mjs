import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";

export function makeRollupConfig(iifeName) {
  const dataPackageName = "@lookit/data";
  const dataPackageIifeName = "chsData";
  const recordPackageName = "@lookit/record";
  const recordPackageIifeName = "chsRecord";

  return jsPsychMakeRollupConfig(iifeName).map((config) => {
    return {
      ...config,
      // Add data and record packages as external dependencys
      external: [...config.external, dataPackageName, recordPackageName],
      output: config.output.map((output) => {
        return {
          ...output,
          globals: {
            ...output.globals,
            // Explicitly state iife names
            [dataPackageName]: dataPackageIifeName,
            [recordPackageName]: recordPackageIifeName,
          },
        };
      }),
    };
  });
}
