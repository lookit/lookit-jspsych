# @lookit/surveys

## 4.0.1

### Patch Changes

- 96a53f6: Add version and data to plugin/extension info. This adds the plugin
  version number ("plugin_version") to the trial data, and fixes the console
  warnings about missing version/data when the experiment loads. Also add
  "chs_version" to data for CHS Survey plugins. The CHS Survey plugins extend
  the core survey plugin and therefore already contain that "plugin_version"
  value in the data.

## 4.0.0

### Patch Changes

- Updated dependencies [372f713]
  - @lookit/templates@2.1.0

## 3.0.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

### Patch Changes

- Updated dependencies [c28bd6c]
  - @lookit/templates@2.0.0
  - @lookit/data@0.2.0

## 2.0.1

### Patch Changes

- 683a072: Fix "missing locale" error when the optional locale parameter is not
  specified in a consent-survey plugin.

## 2.0.0

### Patch Changes

- c678107: Set SurveyJS Locale to trial's locale parameter.
- bbdac4a: Documentation update: add/modify locale parameter documentation.
- c678107: Add localization to the exit survey trial
- Updated dependencies [c678107]
- Updated dependencies [1118fc7]
  - @lookit/templates@1.1.0

## 1.0.0

### Patch Changes

- ec2fdec: Moved @lookit/data to peer dependency.
- Updated dependencies [9605ac4]
  - @lookit/data@0.1.0

## 0.0.5

### Patch Changes

- Updated dependencies [6c42a48]
  - @lookit/data@0.0.5

## 0.0.4

### Patch Changes

- b111054: Update rollup config to hide known circular warnings
- Updated dependencies [b111054]
- Updated dependencies [888be3d]
  - @lookit/data@0.0.4

## 0.0.3

### Patch Changes

- 171a96c: Update to mkdocs config and python packages
- Updated dependencies [171a96c]
  - @lookit/data@0.0.3

## 0.0.2

### Patch Changes

- 506afd8: Added a few tests for coverage.
- 07ce665: Update code formatting
- Updated dependencies [f2cd2a8]
- Updated dependencies [07ce665]
  - @lookit/data@0.0.2
