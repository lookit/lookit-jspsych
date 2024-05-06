import { makeDevConfig } from "../../rollup-dev.mjs";
import rollupConfig from "./rollup.config.mjs";
const port = 10002; // this needs to change for each package
export default makeDevConfig(rollupConfig, port);
