/* eslint-disable func-style */

import { makeRollupConfig as jsPsychMakeRollupConfig } from "@jspsych/config/rollup";

/**
 * Create rollup config for any package.
 *
 * @param iifeName - IIFE Name for this package
 * @returns Rollup config
 */
export function makeRollupConfig(iifeName) {
  const packages = {
    data: { name: "@lookit/data", iife: "chsData" },
    templates: { name: "@lookit/templates", iife: "chsTemplates" },
  };
  const knownCircularDeps = [
    "@smithy/core/dist-es/submodules/protocols/index.js",
    "@smithy/util-stream/dist-es/blob/Uint8ArrayBlobAdapter.js",
    "@smithy/util-endpoints/dist-es/utils/callFunction.js",
    "@smithy/util-endpoints/dist-es/utils/getEndpointProperties.js",
    "@smithy/util-endpoints/dist-es/utils/evaluateRules.js",
    "@aws-crypto/crc32/build/module/index.js",
    "@aws-crypto/crc32c/build/module/index.js",
  ];

  /**
   * Change warnings into errors. This will help us catch build concerns before
   * they are in production. Also, hide known circular dependency warnings. This
   * is copied from Rollup's documentation:
   * https://rollupjs.org/configuration-options/#onlog
   *
   * @param level - Message level
   * @param log - Log object containing location, frame, and message.
   * @param handler - Function called to record log.
   */
  const onLog = (level, log, handler) => {
    // Don't log known circular dependencies with the data package.
    if (log.code === "CIRCULAR_DEPENDENCY" && iifeName === packages.data.iife) {
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
    // We need to update the config from jsPysch
    const output = // Move all outputs into an array
      (Array.isArray(config.output) ? config.output : [config.output])
        // Iife outputs need to have external packages as globals
        .map((o) => {
          return o.format === "iife"
            ? {
                ...o,
                globals: {
                  ...config.output.globals,
                  [packages.data.name]: packages.data.iife,
                  [packages.templates.name]: packages.templates.iife,
                },
              }
            : o;
        })
        // Set source map to true for all outputs
        .map((o) => ({ ...o, sourcemap: true }));

    return {
      ...config,
      onLog,
      // Add data package as external dependency
      external: [
        ...(config.external ? config.external : []),
        packages.data.name,
        packages.templates.name,
      ],
      output,
    };
  });
}
