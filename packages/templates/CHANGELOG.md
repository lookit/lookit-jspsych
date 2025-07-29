# @lookit/templates

## 2.1.0

### Minor Changes

- 372f713: - Templates:
  - add message container to video consent template
  - add public `translateString` method for translating string directly
  - Record:
    - add translated status messages to the video consent plugin: not recording,
      starting, recording, stopping/uploading
    - wait to enable/disable certain buttons until recorder has fully
      started/stopped
    - refactor error messages to use a single ElementNotFound with ID/tag
      arguments
  - Style: add CSS for the video-consent plugin's message container

## 2.0.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

### Patch Changes

- Updated dependencies [c28bd6c]
  - @lookit/data@0.2.0

## 1.1.0

### Minor Changes

- 1118fc7: Adds support for translation and an optional locale parameter to the
  VideoConfigPlugin and StopRecordPlugin in the record packages.

### Patch Changes

- c678107: Add localization to the exit survey trial

## 1.0.0

### Patch Changes

- Updated dependencies [9605ac4]
  - @lookit/data@0.1.0

## 0.0.2

### Patch Changes

- 6c42a48: Generate environment file before production build
- Updated dependencies [6c42a48]
  - @lookit/data@0.0.5

## 0.0.1

### Patch Changes

- bb6754c: Move translations and video consent templates to new templates
  package.
- c879e6a: Add ability to select specific video consent template.
- 9385555: Add Garden's consent template
- Updated dependencies [b111054]
- Updated dependencies [888be3d]
  - @lookit/data@0.0.4
