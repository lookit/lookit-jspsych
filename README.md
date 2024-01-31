# Lookit jsPsych

Here is the monorepo containing packages developed by Lookit to be used with jsPsych on the lookit.mit.edu project.

## Linting/Formating

Lint and formating is done at the monorepo level.

To auto fix linting/formating issues:

```
npm run fix
```

Unfixable issues will be diplayed as errors.

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

At the root of the new package run the following commands:

```sh
mkdir src
echo "export default {}" > src/index.ts
touch tsconfig.json rollup.config.mjs jest.config.cjs
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

## Change log

Adding a change log through `changeset` is done with the following command:

```
npm run changeset
```

Make sure to add the change log found in the `.changeset` directory to the PR.

## Local development environment

To run the local services needed to develop a package, you'll first have install a few things:

```
brew install honcho entr python3
```

To run honcho to start the python http server and to watch for files changing:

```
honcho start
```

You will have to add the following to `web/templates/web/jspsych-study-detail.html` in the `lookit-api` project:

```
<script src="http://localhost:8080/packages/name_of_package/dist/index.browser.js"></script>
```

And start the `lookit-api` local dev server.
