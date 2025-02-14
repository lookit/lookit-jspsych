const config = require("../../jest.cjs").makePackageConfig();
module.exports = {
  ...config,
  coveragePathIgnorePatterns: ["fixtures"],
  transformIgnorePatterns: ["node_modules/(?!jspsych)"],
  moduleNameMapper: {
    "^jspsych/src/(.*)$": "<rootDir>/node_modules/jspsych/src/$1",
  },
  testEnvironmentOptions: {
    ...config.testEnvironmentOptions,
    url: "https://localhost:8000/exp/studies/j/1647e101-282a-4fde-a32b-4f493d14f57e/8a2b2f04-63eb-485a-8e55-7b9362368f19/",
  },
};
