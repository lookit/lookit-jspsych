# @lookit/lookit-initjspsych

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

- be1549c: Modify the on_data_update and on_finish (experiment) callbacks so
  that they do not retrieve the response sequence from the lookit-api and send
  it back with the response update request. The response sequence is now
  computed server-side, and no response retrieval is needed on each data
  update/save.
- d350fb6: Modify the data update callback to send all experiment data back to
  the lookit-api endpoint on each data update, rather than retrieving the
  existing data from lookit-api and appending new data to the result.

## 2.0.1

### Patch Changes

- 9f9647a: Fixed bug that was causing errors when running a jsPsych study that
  contained a timeline node.

## 2.0.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

### Patch Changes

- 7e4c63e: Fixes an error that is thrown when the experiment has only one trial.
- 0d02095: Fix the exit URL interupting final Response patch
- Updated dependencies [c28bd6c]
  - @lookit/data@0.2.0

## 1.0.6

### Patch Changes

- 23acf4c: Bump version to get around incorrectly versioned releases

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

- 07ce665: Update code formatting
- Updated dependencies [f2cd2a8]
- Updated dependencies [07ce665]
  - @lookit/data@0.0.2

## 1.0.5

### Patch Changes

- f528fb3: Update to package config

## 1.0.4

### Patch Changes

- 0f0a82d: Update Typescript to strict config
- 0f0a82d: Add tests

## 1.0.3

### Patch Changes

- 5af0f98: Add build step to gihub actions

## 1.0.2

### Patch Changes

- d5cebc0: Add unpkg config

## 1.0.1

### Patch Changes

- fab88c2: Initial package release
