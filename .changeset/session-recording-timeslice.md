---
"@lookit/record": patch
"@lookit/lookit-initjspsych": patch
"@lookit/data": patch
---

Recordings now start with a 1-second timeslice so that recorded data is uploaded
incrementally during recording instead of being held in browser memory and
uploaded all at once when recording stops. This mainly affects long session
recordings.

Also adds diagnostic logging: recording size at stop (with an error and a
"failure" upload status for empty/0-byte recordings), MediaRecorder errors, and
media track ended/mute/unmute events.

Recording problems are now reported to Sentry when they happen: empty (0-byte)
recordings, MediaRecorder errors, media tracks that end during recording,
recorder stop timeouts, upload failures, and failures to reset the recorder
after a recording. The record package now has access to Sentry reporting via a
`window.chs.captureError` function that lookit-initjspsych sets only when Sentry
is initialized. Nothing is reported during preview sessions. Error messages
don't include filenames or stream times so the same problem groups into a single
Sentry issue (variables values are attached to each event as extra data
instead).
