# @lookit/record

## 6.0.0

### Minor Changes

- cb41e72: - Adds new template option for the video-consent plugin:
  "consent-recording-only". This applies to studies that only use webcam
  recording for the consent statement.
  - Adds new parameter for the video-consent plugin: `only_consent_on_chs`. This
    is used to determine whether or not to include template language around
    data/responses collected on CHS (`false`, the default) vs just the consent
    recording and no other responses/data (`true`).
  - Updates documentation
  - Adds tests

### Patch Changes

- f541d09: Changes to workflow files.
- Updated dependencies [cb41e72]
  - @lookit/templates@3.1.0

## 5.0.0

### Major Changes

- 21a5a0a: **Major/breaking changes**

  `StartRecordPlugin`:

  - Adds HTML content while the recorder is initializing. If the value of the
    new `wait_for_connection_message` parameter is `null` (the default), then
    the message 'establishing video connection, please wait...' will be
    displayed, or the appropriate translation of this message based on the
    `locale` parameter. This content can be overridden with any custom HTML
    content using the `wait_for_connection_message` parameter. **Set this
    parameter to an empty string (`""`) if you want to keep the behavior of
    previous versions** (i.e. blank screen while recording initializes).

  `StopRecordPlugin`, `TrialRecordExtension`:

  - Adds a default upload timeout of 10 seconds before continuing with the
    experiment. If the timeout duration is reached and the experiment moves on,
    the upload will still continue in the background. This duration can be
    changed using the `max_upload_seconds` parameter. **Set this parameter to
    `null` to keep the behavior of previous versions** (i.e. no upload timeout -
    the experiment should wait indefinitely until the upload finishes before
    moving on).

  **New features and minor changes**

  `StartRecordPlugin`, `StopRecordPlugin`, `TrialRecordExtension`:

  - Adds a loading animation (spinning circle) under the text when the defaults
    are used for the `wait_for_connection_message` (`StartRecordPlugin`) and
    `wait_for_upload_message` (`StopRecordPlugin`, `TrialRecordExtension`).
  - Adds information to the browser console about timeouts and errors for the
    recorder's stop and upload events.

  `TrialRecordExtension`:

  - Trial recording now starts at the start of the trial, rather than when the
    trial loads. This makes it less likely for the recording to miss the start
    of the trial. (Note that this is still possible, especially for participants
    on slow/unstable internet connections. We will address this issue in future
    updates as the full fix requires an update to jsPsych core.) This also means
    that trial recordings may be slightly longer than before, as they will now
    include the time between the trial's start and load events.

  `initJsPsych` (`lookit-initjspsych`):

  - The experiment `on_finish` callback function that CHS adds to all
    experiments now waits for all uploads to finish before ending the experiment
    (redirecting to the exit URL), and displays a loading animation (no text)
    while waiting for uploads to finish.

  **Developer notes**

  `record`

  - The `recorder.stop` method now returns an object that contains two promises:
    one for the media recorder's stop event, and the other for the upload (or
    local download). Consumers of `recorder.stop` should await these two
    promises (either/both as needed), rather than awaiting the stop method
    itself.
  - Adds new error types: `NoFileNameErrror` (thrown when `recorder.stop` is
    called if there is no file name) and `TimeoutError` (thrown when the media
    recorder's stop event times out).

  `data`

  - Adds a `pendingUploads` array to the `window.chs` object for tracking
    pending upload promises. The array contains objects with properties
    `promise` (the untimed upload promise) and `file` (filename string).

  `lookit-initjspsych`

  - The change to the experiment `on_finish` callback function added by CHS
    required a switch to creating the function as a closure so that it has
    access to the jsPsych instance.
  - The updated `on_finish` functionality that waits for pending uploads
    requires that `window.chs.pendingUploads` exists, though it does check first
    for better backwards compatibility with the `data` package.

  `templates`

  - Adds new `loader` partial template that is used in `uploading-video` and new
    `establishing-connection` templates.
  - The `loader` partial can also be rendered directly via the new
    `loadingAnimation` export.

  `style`

  - Adds CSS for the `loader` template (imported from `record` package scss).

### Patch Changes

- Updated dependencies [21a5a0a]
  - @lookit/templates@3.0.0
  - @lookit/data@0.3.0

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
