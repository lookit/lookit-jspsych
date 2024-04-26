import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  jsdoc.configs["flat/recommended-typescript-error"],
  {
    rules: {
      "require-await": "error",
      "@typescript-eslint/explicit-member-accessibility": "error",
    },
  },
  {
    plugins: {
      jsdoc,
    },
    rules: {
      "jsdoc/tag-lines": "off",
      "jsdoc/require-description-complete-sentence": "error",
      "jsdoc/require-description": "error",
      "jsdoc/require-hyphen-before-param-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
    },
  },
  prettierConfig,
];
