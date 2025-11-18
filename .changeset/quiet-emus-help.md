---
"@lookit/record": minor
---

Adds a new parameter to the `chsRecord.StopRecordPlugin` called
`wait_for_upload_message`. Use this parameter to display custom HTML content
while the session recording is uploading. Leave unset (`null`, the default) for
the default message: "uploading video, please wait..." (or the appropriate
translation based on the `locale` parameter).
