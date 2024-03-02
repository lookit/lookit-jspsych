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
  "extends": "@jspsych/config/tsconfig.core.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "."
  },
  "include": ["src"]
}
```

Edit `rollup.config.mjs`:

```mjs
import { makeRollupConfig } from "@jspsych/config/rollup";

export default makeRollupConfig("<camelcase name of new package>");
```

Edit `rollup.config.dev.mjs`:

```mjs
import { makeRollupConfig } from "@jspsych/config/rollup";

import { makeDevConfig } from "../../rollup-dev.mjs";

const rollupConfig = makeRollupConfig("lookitInitJsPsych");
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

## Linting/Formating

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

## Run Dev Server

To run a development server:

```
npm run dev -w @lookit/<name of package>
```

When the server has started, you should see something very similar to `<script src="http://127.0.0.1:10001/index.browser.js"></script>` printed out. Add this html to `web/templates/web/jspsych-study-detail.html` in the Django lookit api project to test the package in your local development environment.
