import serve from "rollup-plugin-serve";

const host = "localhost";
const content_dir = "dist/";

export function makeDevConfig(rollupConfig, port) {
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
        if (port !== 10005) {
          console.log(
            `<script src="${protocol}://${host}:${address.port}/index.browser.js"></script>`,
          );
        } else {
          console.log(
            `<link rel="stylesheet" href="${protocol}://${host}:${address.port}/index.css">`,
          );
        }
      },
    }),
  ];

  return rollupConfig;
}
