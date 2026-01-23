# @lookit/style

## 0.3.0

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

## 0.2.0

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

- 21f05bc: Fix the webcam feed layout jump in video-consent trials when
  recording stops.

## 0.1.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

## 0.0.6

### Patch Changes

- 1a7d73e: Change the webcam display to mirror the participant.
- 1118fc7: Adds support for translation and an optional locale parameter to the
  VideoConfigPlugin and StopRecordPlugin in the record packages.

## 0.0.5

### Patch Changes

- ec2fdec: Update consent video style

## 0.0.4

### Patch Changes

- 9385555: Update consent trial style
- b111054: Update rollup config to hide known circular warnings
- 888be3d: Update to unpkg config

## 0.0.3

### Patch Changes

- 171a96c: Update to mkdocs config and python packages

## 0.0.2

### Patch Changes

- b729922: Add consent video trial
- 07ce665: Update code formatting
