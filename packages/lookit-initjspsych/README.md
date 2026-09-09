# CHS's initJsPsych

[Version History](https://github.com/lookit/lookit-jspsych/blob/main/packages/lookit-initjspsych/CHANGELOG.md)

This package contains the repackaging of jsPsych's initjsPsych function. We
needed to give ourselves the ability to do two things:

- Validate the trial timeline.
- Record trial data to CHS's API.

## chsInitJsPsych

This function will make available `initJsPsych()` and it can be expected to
operate as the original.

```javascript
initJsPsych = chsInitJsPsych(responseUuid);
```

The above code is already placed into the experiment before your code. For
transparency, you can always find `chsInitJsPsych()` on
[npmjs](https://www.npmjs.com/package/@lookit/lookit-initjspsych?activeTab=code),
[github](https://github.com/lookit/lookit-jspsych/tree/main/packages/lookit-initjspsych/src),
and [unpkg](https://unpkg.com/browse/@lookit/lookit-initjspsych/src/). Please
feel free to reach out with any questions or concerns.

## Error tracking (Sentry)

When `chsInitJsPsych()` runs, it initializes [Sentry](https://sentry.io/) for
error tracking. This lets us catch and diagnose JavaScript errors that
participants hit during a study.

Configuration is baked in at build time from the repo-root `.env` file (via the
`rollup-plugin-dotenv` plugin):

| Variable             | Description                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_DSN`         | Sentry project DSN. If empty/unset, Sentry is not initialized so that local/dev builds can still run without it.                                                                |
| `SENTRY_ENVIRONMENT` | Environment name, e.g. `production` or `staging` (this is currently always `production`, but we will implement the distinction later).                                          |
| `SENTRY_RELEASE`     | Release identifier. Set automatically in the release workflow to the git commit SHA (which pins every package in this monorepo at once); optional (and empty) for local builds. |

**Preview sessions are not tracked.** Because study previews are how researchers
develop and debug their own studies, any errors during a preview are often the
researcher's own (a trial type that wasn't loaded, a typo in a hook, etc.)
rather than a problem in CHS. When the session is a preview (`is_preview`),
Sentry is not initialized at all so that researcher debugging doesn't flood the
project with false alarms. However, if a CHS issue is suspected during
development, the researcher/staff can always make the study "public" (but not
discoverable) and run a non-preview session, which will produce Sentry error
logs.

Only non-identifying context is sent to Sentry as tags: the study UUID and
(public) study name, the response UUID, the **hashed** child id, and the preview
flag. No family/child PII (names, birthdays, global IDs, etc.) is ever sent.

Session replay is configured to be privacy-preserving, which matters because CHS
studies involve children:

- **All text is masked** — on-screen text renders as blocked-out boxes in the
  replay.
- **All inputs are masked** — anything typed (names, free-text answers) shows as
  `***`.
- **All media is blocked** — images, `<video>`, and canvas elements (including
  the child's webcam feed) are not captured and appear as empty placeholders.
- **Only sessions with an error are recorded** — ordinary participant sessions
  are never recorded.
