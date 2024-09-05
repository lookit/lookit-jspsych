module.exports.makePackageConfig = () => {
  const config = require("@jspsych/config/jest").makePackageConfig(__dirname);
  return {
    ...config,
    transform: {
      ...config.transform,
      "^.+\\.mustache$": "<rootDir>/../../jest.text.loader.js",
    },
    moduleNameMapper: { "@lookit/data": "<rootDir>/../../packages/data/src" },
    coverageThreshold: {
      global: {
        lines: 100,
        statements: 0,
      },
    },
  };
};
