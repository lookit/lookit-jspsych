module.exports.makePackageConfig = () => {
  return {
    ...require("@jspsych/config/jest").makePackageConfig(__dirname),
    moduleNameMapper: { "@lookit/data": "<rootDir>/../../packages/data/src" },
    coverageThreshold: {
      global: {
        lines: 100,
        statements: 0,
      },
    },
  };
};
