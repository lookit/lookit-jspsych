module.exports.makePackageConfig = () => {
  return {
    ...require("@jspsych/config/jest").makePackageConfig(__dirname),
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: -10,
      },
    },
  };
};
