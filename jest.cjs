module.exports.makePackageConfig = () => {
  return {
    ...require("@jspsych/config/jest").makePackageConfig(__dirname),
    coverageThreshold: {
      global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 0,
      },
    },
  };
};
