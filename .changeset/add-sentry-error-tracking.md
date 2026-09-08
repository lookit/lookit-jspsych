---
"@lookit/lookit-initjspsych": minor
---

Add Sentry error tracking to CHS jsPsych experiments.

`chsInitJsPsych()` now initializes [Sentry](https://sentry.io/) error tracking
when the experiment is set up. The Sentry DSN, environment, and release are
configured at build time via the `.env` file (`SENTRY_DSN`,
`SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`); if no DSN is set, Sentry is not
initialized so local/dev builds are unaffected.

Only non-identifying context is attached as Sentry tags (study UUID/name,
response UUID, hashed child id, and preview flag) — no child PII. Session replay
is privacy-preserving (all text/inputs masked, all media blocked, and only error
sessions recorded). Known end-of-experiment failure points (final response-data
save, recording uploads, and upload-status saves) now also report their errors
to Sentry in addition to logging them.
