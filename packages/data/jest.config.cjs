const config = require("@jspsych/config/jest").makePackageConfig(__dirname);
module.exports = {
  ...config,
  moduleNameMapper: {},
  transformIgnorePatterns: ["node_modules/(?!deep-freeze-es6)"],
};
