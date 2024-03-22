# Lookit jsPsych

Here is the monorepo containing packages developed by Lookit to be used with jsPsych on the lookit.mit.edu project.

## Create new package

We are using npm workspaces for managing our packages.

To create a new package, run the following at the root of the project:

```
npm init --scope @lookit --workspace packages/<name of new package>
```

Giving the default answers to `npm init` seems to work okay. I am sure this will change.

Add build and test script to new package's `package.json`:

```json
  "scripts": {
    "test": "jest --coverage",
    "dev": "rollup --config rollup.config.dev.mjs --watch",
    "build": "rollup --config"
  },
```

And add the following to `package.json`:

```json
  "unpkg": "dist/index.browser.min.js",
  "files": [
    "src",
    "dist"
  ],
```

Update the following in `package.json`:

```json
    "main": "dist/index.js",
```

At the root of the new package run the following commands:

```sh
mkdir src
echo "export default {}" > src/index.ts
touch tsconfig.json rollup.config.mjs rollup.config.dev.mjs jest.config.cjs
cd ../..
```

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": "."
  },
  "extends": "@jspsych/config/tsconfig.core.json",
  "include": ["src"]
}
```

Edit `rollup.config.mjs`:

```mjs
import { makeRollupConfig } from "@jspsych/config/rollup";
// This package name needs to be unique
export default makeRollupConfig("<camelcase name of new package>");
```

Edit `rollup.config.dev.mjs`:

```mjs
import { makeDevConfig } from "../../rollup-dev.mjs";
import rollupConfig from "./rollup.config.mjs";
const port = 10001; // this needs to change for each package
export default makeDevConfig(rollupConfig, port);
```

Edit `jest.config.cjs`

```cjs
const config = require("@jspsych/config/jest").makePackageConfig(__dirname);
config.moduleNameMapper = {};
module.exports = config;
```

You will need `@jspsych/config` to build your new package:

```sh
npm i @jspsych/config -w @lookit/<name of new package>
```

## Build all packages

We can use npm workspaces to build all packages.

First, install dependencies:

```
npm ci
```

Build all packages:

```
npm run build
```

## Linting/formating

Lint and formating is done at the monorepo level.

To auto fix linting/formating issues:

```
npm run fix
```

Unfixable issues will be diplayed as errors.

## Change log

Adding a change log through `changeset` is done with the following command:

```
npm run changeset
```

Make sure to add the change log found in the `.changeset` directory to the PR.

## Run dev server

To run a development server:

```
npm run dev -w @lookit/<name of package>
```

When the server has started, you should see something very similar to `<script src="http://127.0.0.1:10001/index.browser.js"></script>` printed out. Add this html to `web/templates/web/jspsych-study-detail.html` in the Django lookit api project to test the package in your local development environment.

### Serve multiple packages

The above command will serve a single package and wait for changes. If you need to serve multiple packages locally, you can open separate terminals for each package and run the `npm run dev` command in each. Another option is to install [Honcho](https://github.com/nickstenning/honcho) and write a Procfile to serve/watch multiple packages in the same terminal.

Create a file called `Procfile` in the root project directory, and list the `npm run dev` commands for each package that you want to serve, preceded by the label you want to give it (to identify the print statements associated with each package in the terminal).

```
lookit-initjspsych: npm run dev -w @lookit/lookit-initjspsych
lookit-api: npm run dev -w @lookit/lookit-api
lookit-helpers: npm run dev -w @lookit/lookit-helpers
```

This method is optional (Honcho should not be added to the project dependencies, and Procfile has been added to our gitignore).
