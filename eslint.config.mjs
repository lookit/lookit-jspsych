import pluginJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "require-await": "error",
      "@typescript-eslint/explicit-member-accessibility": "error",
    },
    ignores: ["packages/data/src/s3/**"],
  },
];
