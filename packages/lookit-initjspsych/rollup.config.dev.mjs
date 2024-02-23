import { makeRollupConfig } from "@jspsych/config/rollup";

import { makeDevConfig } from "../../rollup-dev.mjs";

const rollupConfig = makeRollupConfig("lookitInitJsPsych");
const port = 10001; // this needs to change for each package

export default makeDevConfig(rollupConfig, port);
