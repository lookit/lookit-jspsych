# @lookit/templates

## 3.1.0

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

## 3.0.0

### Minor Changes

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
  - @lookit/data@0.3.0

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
