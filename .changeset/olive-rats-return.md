---
"@lookit/record": minor
---

Updates `chsRecord.TrialRecordExtension` to include options for updating the
page content after the trial finishes, while the trial recording is uploading.

- By default, the trial recording extension will now display the default
  uploading message ("uploading video, please wait...").
- This adds support for the `locale` parameter to translate the default message
  to another supported language.
- This adds a new parameter called `wait_for_upload_message` which can be used
  to display custom HTML content while the trial recording is uploading. This
  parameter takes precedence over `locale`. Use a blank string (`""`) for no
  message/content.
