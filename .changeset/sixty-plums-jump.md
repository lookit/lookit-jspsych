---
"@lookit/templates": minor
"@lookit/record": minor
---

- Adds new template option for the video-consent plugin:
  "consent-recording-only". This applies to studies that only use webcam
  recording for the consent statement.
- Adds new parameter for the video-consent plugin: `only_consent_on_chs`. This
  is used to determine whether or not to include template language around
  data/responses collected on CHS (`false`, the default) vs just the consent
  recording and no other responses/data (`true`).
- Updates documentation
- Adds tests
