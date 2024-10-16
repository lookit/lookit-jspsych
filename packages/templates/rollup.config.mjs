// import { makeRollupConfig } from "@jspsych/config/rollup";
// // This package name needs to be unique
// export default makeRollupConfig("chsTemplates");

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
    ],
  };
});
