import nodePolyfills from "rollup-plugin-polyfill-node";
import { importAsString } from "rollup-plugin-string-import";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsTemplates").map((config) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,

      // Add support to import yaml and handlebars files as strings
      importAsString({
        include: ["**/*.yaml", "**/*.hbs"],
      }),
      // Handlebars requires node polyfills.
      nodePolyfills(),
    ],
  };
});
