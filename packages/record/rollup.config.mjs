import dotenv from "rollup-plugin-dotenv";
import copy from 'rollup-plugin-copy'
import { makeRollupConfig } from "../../rollup.mjs";

export default makeRollupConfig("chsRecord").map((config) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Add support for .env files
      dotenv(),
      copy({
        targets: [
          {src: 'src/mic_check.js', dest: 'dist'}
        ]
      })
    ],
  };
});
