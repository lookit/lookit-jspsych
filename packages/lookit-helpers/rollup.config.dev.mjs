import { makeDevConfig } from "../../rollup-dev.mjs";
import rollupConfig from "./rollup.config.mjs";
const port = 10003; // this needs to change for each package
export default makeDevConfig(rollupConfig, port);
