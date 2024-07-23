import dotenv from "rollup-plugin-dotenv";
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsRecord").map((config) => {
  return {
    ...config,
    plugins: [
      // Add support for .env files
      dotenv(),
      ...config.plugins,
    ],
  };
});
