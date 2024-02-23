import { makeRollupConfig } from "@jspsych/config/rollup";
import serve from "rollup-plugin-serve";

const rollupConfig = makeRollupConfig("lookitInitJsPsych");
const host = "localhost";
const port = 10003; // this needs to change for each package
const content_dir = "dist/";

rollupConfig.plugins = [
  // options: https://github.com/thgh/rollup-plugin-serve/tree/master?tab=readme-ov-file#options
  serve({
    contentBase: content_dir,
    historyApiFallback: true,
    host: host,
    port: port,
    onListening: function (server) {
      const address = server.address();
      const host =
        address.address === "::" || address.address === "::1"
          ? "localhost"
          : address.address;
      const protocol = this.https ? "https" : "http";
      console.log(
        `<script src="${protocol}://${host}:${address.port}/index.browser.js"></script>`,
      );
    },
  }),
];

export default rollupConfig;
