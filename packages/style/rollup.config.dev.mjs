import { makeDevConfig } from "../../rollup-dev.mjs";
import { config } from "./rollup.config.mjs";
const port = 10005; // this needs to change for each package
export default makeDevConfig(
  [config("dist", "index.css", "expanded", true)],
  port,
);
