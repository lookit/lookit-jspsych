module.exports = {
  ...require("../../jest.cjs").makePackageConfig(),
  transformIgnorePatterns: ["node_modules/(?!auto-bind)"],
};
