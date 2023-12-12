# Lookit jsPsych

Here is the monorepo containing packages developed by Lookit to be used with jsPsych on the lookit.mit.edu project.

# Linting/Formating

Lint and formating is done at the monorepo level.

To lint:

```
npm run lint
```

To format:

```
npm run format
```

# Create new package

We are using npm workspaces for managing our packages.

To create a new package:

```
npm init -w packages/<name of new package>
```

Add build script to new package `package.json`:

```json
  "scripts": {
    ...,
    "build": "rollup --config"
  },
```

At the root of the new package run the following commands:

```sh
mkdir src
echo "export default {}" > src/index.ts
touch tsconfig.json rollup.config.mjs
cd ../..
```

Edit `tsconfig.json`:

```json
{
  "extends": "@jspsych/config/tsconfig.core.json",
  "compilerOptions": {
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

You will need `@jspsych/config` to build your new package:

```sh
npm i @jspsych/config -w <name of new package>
```

# Build all packages

We can use npm workspaces to build all packages.

First, install JavaScript packages:

```
npm ci
```

Build all packages:

```
npm run build --workspaces
```
