module.exports = {
  ...require("../../jest.cjs").makePackageConfig(),
  transformIgnorePatterns: ["node_modules/(?!deep-freeze-es6)"],
};
