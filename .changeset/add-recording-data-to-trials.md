---
"@lookit/data": minor
"@lookit/record": minor
"@lookit/lookit-initjspsych": minor
---

These updates add video-recording information to the jsPsych experiment data,
including per-file upload success/failure.

Trials associated with a recording now contain a `chs_recording` object in the
experiment data, with the following properties:

- `filename`
- `is_session_recording`
- `method`: One of: "camera", "microphone"
- `is_consent`
- `stream_time`: Object with stream time events and timestamps, or `null` if no
  stream time was captured for the trial:
  - `trial_start_ms`: The recording stream time (in ms) that marks the start of
    the trial. For a session recording this is positive (how far into the
    recording the trial began). For a single-trial recording it is the offset
    between the trial start and when the recording actually began — typically a
    small negative value, since a single-trial recording starts slightly after
    the trial begins.
- `start_time_source`: How the stream-time reference point (i.e the start of
  recording timestamp) was determined. Captured per trial, alongside that
  trial's stream time, so it describes the reference the trial's stream time was
  actually measured against. One of:
  - "event": The recorder's start event - most precise.
  - "fallback": A timestamp taken 1 second after attempting to start the
    recording, because the start event did not fire. (This is a precaution to
    stop the experiment from hanging if there's a problem or delay starting the
    recording - stream_time values may be inaccurate!)
  - "fallback_corrected": The fallback timestamp was used initially to avoid
    blocking the experiment, but the "start" event later fired and corrected the
    start time, and this trial's stream time was measured against the corrected
    reference. Because the source is per trial, a single session recording can
    show "fallback" on a trial captured before the correction and
    "fallback_corrected" on later trials.
- `upload_status`: One of: "pending", "success", "failure".
- `upload_error`: Only included if the upload fails.

`@lookit/data`:

- Adds the `ChsRecordingData` shape (and its `StartTimeSource`,
  `RecordingUploadStatus`, and `RecordingStreamTime` subtypes) to the experiment
  data structure (`JsPsychExpData.chs_recording`).
- Adds adds `status`/`error_message` to the tracked upload records in
  `window.chs.pendingUploads`.

`@lookit/record`:

- The `Recorder` now captures the recording's start timestamp, which is the
  reference for calculating future stream times, from the MediaRecorder "start"
  event.
- In order to get an accurate start time for the recording, the `Recorder`'s
  public async `start` method now awaits the MediaRecorder's start event, with a
  1s timeout, and then falls back to a synchronous start timestamp that will be
  corrected if a slow "recording started" event fires later. The start timestamp
  source (event, fallback, fallback_corrected) is logged in the experiment data.
- The `Recorder` now tracks each upload's outcome as it settles, and logs this
  in the experiment data: "pending", "success", or "failure" (with error).
- The `Recorder` exposes new methods to build the recording data from within the
  plugin/extension: `getStreamTimeAt` (for a given timestamp), `getStreamTime`
  (right now - convenience wrapper), `getChsRecordingData`, and
  `getSessionTrialRecordingData`.
- `StartRecordPlugin` and the `TrialRecordExtension` use the new methods to
  retrieve the recording data and insert it into the experiment's trial data.
  The `TrialRecordExtension` captures the trial-start timestamp when the trial
  starts and computes its stream time (the offset from recording start) when the
  trial finishes, since jsPsych does not await an extension's `on_start` and the
  recording's start time is not yet known at that point.
- The `VideoConsentPlugin` and `VideoAssentPlugin` now also attach their
  recording data to the trial data (as non-session recordings, with `is_consent`
  true for consent). The block is captured before the recorder is stopped (which
  resets it), so that fields like `start_time_source` are preserved.
  `stream_time` is `null` for these, since the recording is triggered
  manually/mid-trial and a trial-start offset isn't meaningful. Assent only
  attaches recording data when the trial actually records
  (`record_whole_procedure` or `record_last_page`).

`@lookit/lookit-initjspsych`:

- Adds `on_trial_start`/`on_trial_finish` hooks that record the
  session-recording stream time on each trial during a session recording.
- The experiment `on_finish` now writes each recording's upload outcome into the
  matching trials' data.
