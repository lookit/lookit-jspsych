# @lookit/record

## 4.1.0

### Minor Changes

- a51ef72: Updates `chsRecord.TrialRecordExtension` to include options for
  updating the page content after the trial finishes, while the trial recording
  is uploading.

  - By default, the trial recording extension will now display the default
    uploading message ("uploading video, please wait...").
  - This adds support for the `locale` parameter to translate the default
    message to another supported language.
  - This adds a new parameter called `wait_for_upload_message` which can be used
    to display custom HTML content while the trial recording is uploading. This
    parameter takes precedence over `locale`. Use a blank string (`""`) for no
    message/content.

- a51ef72: Adds a new parameter to the `chsRecord.StopRecordPlugin` called
  `wait_for_upload_message`. Use this parameter to display custom HTML content
  while the session recording is uploading. Leave unset (`null`, the default)
  for the default message: "uploading video, please wait..." (or the appropriate
  translation based on the `locale` parameter).

### Patch Changes

- dc1708c: Fix runtime errors that occurred when the experiment contained
  multiple trial recordings or session recordings.
- 96a53f6: Add version and data to plugin/extension info. This adds the plugin
  version number ("plugin_version") to the trial data, and fixes the console
  warnings about missing version/data when the experiment loads. Also add
  "chs_version" to data for CHS Survey plugins. The CHS Survey plugins extend
  the core survey plugin and therefore already contain that "plugin_version"
  value in the data.

## 4.0.0

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

### Patch Changes

- e9255bd: Fixes a problem with the consent video plugin in which the user can
  try to replay a video recording before the it has fully stopped.
- 21f05bc: Fix the webcam feed layout jump in video-consent trials when
  recording stops.
- Updated dependencies [372f713]
  - @lookit/templates@2.1.0

## 3.0.1

### Patch Changes

- 5ec0b66: Fix recording playback issues, which were caused by not specifying
  codecs in the recorder mime type.
- 1f7afa1: Update the documentation.

## 3.0.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

### Patch Changes

- Updated dependencies [c28bd6c]
  - @lookit/templates@2.0.0
  - @lookit/data@0.2.0

## 2.0.0

### Minor Changes

- 1118fc7: Adds support for translation and an optional locale parameter to the
  VideoConfigPlugin and StopRecordPlugin in the record packages.

### Patch Changes

- 1a7d73e: Change the webcam display to mirror the participant.
- bbdac4a: Documentation update: add/modify locale parameter documentation.
- 4df1e26: Update video consent template options in documentation.
- Updated dependencies [c678107]
- Updated dependencies [1118fc7]
  - @lookit/templates@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [9605ac4]
  - @lookit/data@0.1.0
  - @lookit/templates@1.0.0

## 0.0.5

### Patch Changes

- 6c42a48: Generate environment file before production build
- 7230f51: Add missing default value for video consent "additional_segments"
  parameter, which was causing an error when this optional parameter was omitted
  (#84).
- Updated dependencies [6c42a48]
  - @lookit/templates@0.0.2
  - @lookit/data@0.0.5

## 0.0.4

### Patch Changes

- bb6754c: Move translations and video consent templates to new templates
  package.
- c879e6a: Add ability to select specific video consent template.
- 4e72f2b: Adds `chs_type: "consent"` to consentVideo trial data and updates the
  lookit-api response object with `completed_consent_frame: true` at the end of
  the consentVideo trial.
- b111054: Update rollup config to hide known circular warnings
- 2a3ce6d: Change video file names to match existing format, and to pass
  necessary info to AWS Lambda for saving video files to database.
- 496b62d: Unmute playback of recorded consent video.
- 9385555: Add Garden's consent template
- Updated dependencies [bb6754c]
- Updated dependencies [c879e6a]
- Updated dependencies [b111054]
- Updated dependencies [888be3d]
- Updated dependencies [9385555]
  - @lookit/templates@0.0.1
  - @lookit/data@0.0.4

## 0.0.3

### Patch Changes

- 171a96c: Update to mkdocs config and python packages
- 171a96c: Documentation for the video consent trial
- Updated dependencies [171a96c]
  - @lookit/data@0.0.3

## 0.0.2

### Patch Changes

- 07ce665: Replace MustacheJS with Handlebars
- b729922: Add consent video trial
- 506afd8: Added a few tests for coverage.
- 07ce665: Add remaining translations
- 07ce665: Update code formatting
- Updated dependencies [f2cd2a8]
- Updated dependencies [07ce665]
  - @lookit/data@0.0.2
