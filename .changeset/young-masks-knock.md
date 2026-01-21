---
"@lookit/record": major
"@lookit/templates": minor
"@lookit/style": minor
"@lookit/data": minor
"@lookit/lookit-initjspsych": minor
---

**Major/breaking changes**

`record`, `templates`, `style`:

- `StartRecordPlugin`: Adds HTML content while the recorder is initializing
  during the start session recording trial. If the value is `null` (the
  default), then the message 'establishing video connection, please wait...'
  will be displayed, or the appropriate translation of this message based on the
  `locale` parameter. This content can be overridden with any custom HTML
  content using the `wait_for_connection_message` parameter. **Set this
  parameter to an empty string (`""`) if you want to keep the behavior or
  previous versions (i.e. blank screen).**

`record`:

- `StopRecordPlugin`, `TrialRecordExtension`: Adds a default upload timeout of
  10 seconds before continuing with the experiment. If the timeout druation is
  reached and the experiment continues, the upload will still continue in the
  background. This duration can be changed using the `max_upload_seconds`
  parameter. **Set this parameter to to keep the behavior or previous versions
  (i.e. ).**

**New features and minor changes**

`record`, `templates`, `style`:

- `StartRecordPlugin`, `StopRecordPlugin`, `TrialRecordExtension`: Adds a
  loading animation (spinning circle) under the text when the defaults are used
  for the `wait_for_connection_message` and `wait_for_upload_message`.

`record`:

- `StartRecordPlugin`, `StopRecordPlugin`, `TrialRecordExtension`: Adds
  information to the browser console about timeouts and errors for the
  recorder's stop and upload events.
- `TrialRecordExtension`: Trial recording now starts at the start of the trial,
  rather than when the trial loads. This makes it less likely to miss the start
  of the trial. (Note that this is still possible, especially for participants
  on slow/unstable internet connections. We will address this issue in future
  updates as the full fix requires an update to jsPsych core.) This also means
  that trial recordings may be slightly longer than before, as they will now
  include the time between the trial's start and load events.

`lookit-initjspsych`:

- The experiment `on_finish` callback function that CHS adds to all experiments
  now waits for all uploads to finish before ending the experiment (redirecting
  to the exit URL), and displays a loading animation (no text) while waiting for
  uploads to finish.

**Developer-facing**

`record`

- The `recorder.stop` method now returns an object that contains two promises:
  one for the media recorder's stop event, and the other for the upload (or
  local download). Consumers of `recorder.stop` should await these two promises
  (either/both as needed), rather than awaiting the stop method itself.
- Adds new error types: `NoFileNameErrror` (thrown when `recorder.stop` is
  called if there is no file name) and `TimeoutError` (thrown when the media
  recorder's stop event times out).

`data`

- Adds a `pendingUploads` array to the `window.chs` object for tracking pending
  upload promises. The array contains objects with properties `promise` (the
  untimed upload promise) and `file` (filename string).

`lookit-initjspsych`

- The change to the experiment `on_finish` callback function added by CHS
  required a switch to creating the function as a closure so that it has access
  to the jsPsych instance.

`templates`

- Adds new `loader` partial template that is used in `uploading-video` and new
  `establishing-connection` templates.
- The `loader` partial can also be rendered directly via the new
  `loadingAnimation` export.
