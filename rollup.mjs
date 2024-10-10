/* eslint-disable func-style */

import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";
import { iifeNameData } from "./packages/data/rollup.config.mjs";

/**
 * Create rollup config for any package.
 *
 * @param iifeName - IIFE Name for this package
 * @returns Rollup config
 */
export function makeRollupConfig(iifeName) {
  const dataPackageName = "@lookit/data";

  const knownCircularDeps = [
    "@smithy/util-stream/dist-es/blob/Uint8ArrayBlobAdapter.js",
    "@smithy/util-endpoints/dist-es/utils/callFunction.js",
    "@smithy/util-endpoints/dist-es/utils/getEndpointProperties.js",
    "@smithy/util-endpoints/dist-es/utils/evaluateRules.js",
    "@aws-crypto/crc32/build/module/index.js",
    "@aws-crypto/crc32c/build/module/index.js",
  ];

  /**
   * Change warnings into errors. This will help us catch build concerns before
   * they are in production. Also, hide known circular dependency warnings. This is
   * copied from Rollup's documentation:
   * https://rollupjs.org/configuration-options/#onlog
   *
   * @param level - Message level
   * @param log - Log object containing location, frame, and message.
   * @param handler - Function called to record log.
   */
  const onLog = (level, log, handler) => {
    // Don't log known circular dependencies with the data package.
    if (log.code === "CIRCULAR_DEPENDENCY" && iifeName === "chsData") {
      if (knownCircularDeps.some((value) => log.message.includes(value))) {
        return;
      }
    }

    if (level === "warn") {
      handler("error", log);
    } else {
      handler(level, log);
    }
  };

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
      onLog,
    };
  });
}
