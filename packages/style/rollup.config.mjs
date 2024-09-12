import scss from "rollup-plugin-scss";
import * as sass from "sass";

/**
 * Generate style rollup config.
 *
 * @param dir - Directory where file will be placed.
 * @param fileName - Name of css file.
 * @param outputStyle - Output style usually "expanded" or "compressed". See
 *   Sass docs for more.
 * @param sourceMap - Should the source map be generated.
 * @returns Config to be passed to rollupjs.
 */
export const config = (
  dir,
  fileName,
  outputStyle = "expanded",
  sourceMap = false,
) => ({
  input: "src/index.ts",
  output: { dir },
  plugins: [
    scss({
      sass,
      fileName,
      sourceMap,
      outputStyle,
      failOnError: true,
      includePaths: ["../../node_modules"],
    }),
  ],
});

export default [
  config("src", "index.css"),
  config("dist", "index.css"),
  config("dist", "index.min.css", "compressed"),
];
