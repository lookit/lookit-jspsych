# Lookit jsPsych

[![Documentation Status](https://readthedocs.org/projects/lookit-jspsych/badge/?version=latest)](https://lookit.readthedocs.io/projects/chs-jspsych)
[![Github Actions build](https://github.com/lookit/lookit-jspsych/actions/workflows/build.yml/badge.svg)](https://github.com/lookit/lookit-jspsych/actions/workflows/build.yml)
[![Github Actions release](https://github.com/lookit/lookit-jspsych/actions/workflows/release.yml/badge.svg)](https://github.com/lookit/lookit-jspsych/actions/workflows/release.yml)

Here is our mono-repo containing packages developed by Lookit to used with
jsPsych on the lookit.mit.edu project.

For those looking to use our jsPsych packages, please see our
[researcher documentation](https://lookit.readthedocs.io/projects/chs-jspsych).

## Create new package

We are using npm workspaces for managing our packages.

To create a new package, run the following at the root of the project:

```
npm init --scope @lookit --workspace packages/<name of new package>
```

Giving the default answers to `npm init` seems to work okay. I am sure this will
change.

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
    "baseUrl": ".",
    "strict": true
  },
  "extends": "@jspsych/config/tsconfig.json",
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
module.exports = require("../../jest.cjs").makePackageConfig();
```

You will need `@jspsych/config` to build your new package:

```sh
npm i @jspsych/config -w @lookit/<name of new package>
```

## Build all packages

First, create a `.env` file at the root of the monorepo. It can contain the
following for a successful local development build.

```
DEBUG=true
LOCAL_DOWNLOAD=true
```

Next, we can use npm to install dependencies.

```
npm ci
```

Then, build all packages.

```
npm run build
```

### Troubleshooting

- Check your local versions of Node.js and `npm` against the versions listed in
  `package.json` to ensure that you are using compatible versions.

- The `npm ci` step may commonly fail when trying to install node-canvas. You
  can fix the problem by running the following, then repeating the build steps
  above. See the
  [node-canvas documentation](https://github.com/Automattic/node-canvas?tab=readme-ov-file#compiling)
  for more details.

```sh
# masOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman python-setuptools

# linux
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

## Linting/formating

Lint and formatting is done at the monorepo level.

To auto fix linting/formatting issues:

```
npm run fix
```

Unfixable issues will be displayed as errors.

## Change log

Adding a change log through `changeset` is done with the following command:

```
npm run changeset
```

Try to only bump packages that have actual changes and be sure to add the change
log found in the `.changeset` directory to the PR.

## Package Release

Package release is automated using github actions. You can find the release
script in this repo in the `.github/workflows/` directory.

The NPM token required to release packages should never expire. If, for some
reason, a new token is required. You will have to first generate one through
NPM.

1.  Login to https://www.npmjs.com.
2.  Select "Access Tokens" from your user dropdown.
3.  In the "Generate New Token" dropdown, select "Classic Token".
4.  Give the token a meaningful name, select "Automation" radio button, and
    click "Generate Token".
5.  Copy token or leave the website open. If you close this page without
    copying, you will have to generate a new token. There will be no way to get
    it back.

Next we have to move the NPM token to github actions.

1. Login to Github and goto
   https://github.com/lookit/lookit-jspsych/settings/secrets/actions.
2. Click the "Pencil" icon next to `NPM_TOKEN`.
3. Paste NPM token from above. There won't be a token in the value box. This is
   to keep the current token secret.
4. Click "Update secret".

This should allow the release script to be able to publish our packages without
authentication.

## Run dev server

To run a development server:

```
npm run dev -w @lookit/<name of package>
```

### Serve multiple packages

The above command will serve a single package and wait for changes. If you need
to serve multiple packages locally, you can open separate terminals for each
package and run the `npm run dev` command in each. Another option is to install
[Honcho](https://github.com/nickstenning/honcho) and write a Procfile to
serve/watch multiple packages in the same terminal.

Create a file called `Procfile` in the root project directory, and list the
`npm run dev` commands for each package that you want to serve, preceded by the
label you want to give it (to identify the print statements associated with each
package in the terminal).

```
lookit-data: npm run dev -w @lookit/data
lookit-templates: npm run dev -w @lookit/templates
lookit-initjspsych: npm run dev -w @lookit/lookit-initjspsych
lookit-record: npm run dev -w @lookit/record
lookit-style: npm run dev -w @lookit/style
lookit-surveys: npm run dev -w @lookit/surveys
```

This method is optional (Honcho should not be added to the project dependencies,
and Procfile has been added to our gitignore).

### Run with lookit-api

When the server has started, for each package you should see console output
similar to

```sh
lookit-<package> | <script src="http://127.0.0.1:10001/index.browser.js"></script>
```

In the lookit-api Django project, navigate to
`web/templates/web/jspsych-study-detail.html` and replace the existing package
link with this new html, as seen below. This will allow you to test the package
in your local development environment.

```html
<!-- <script src="https://unpkg.com/@lookit/<package_name>@0.2.0"
        integrity="sha384-iMjDaQDmCTXe6XO59EktLBsg7KmDZZvT5jN/QMiP+ctA8YfQDT/hATDKM1EtoxBQ"
        crossorigin="anonymous"></script> -->
<script src="http://127.0.0.1:10001/index.browser.js"></script>
```

## Documentation

To run documentation development server you will need to have Python 3.12 and
[Poetry](https://python-poetry.org/docs/#installation) installed. To start the
local development server:

```
make serve
```

To build the documentation:

```
make build
```

This will create/update a "site" directory in the project root, containing all
of the static files.

### Structure

The documentation pages are generated from the README markdown files in the
project root directory and the individual package directories. The main project
documentation page comes from the root markdown file at `packages/index.md` and
the documentation for each package comes from the README markdown files in each
package root (e.g. `packages/data/README.md` for the `Data` package.) This
documentation structure is defined in `mkdocs.yml`.

The reason for having the documentation pages in these different locations
throughout the repository is so that they can be re-used as the package's
landing page on NPM. This way, the documentation is bundled into each package,
and the NPM site `npmjs.com` will automatically use the README.md file as the
package's landing page.
