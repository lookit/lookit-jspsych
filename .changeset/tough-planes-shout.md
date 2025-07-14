---
"@lookit/templates": minor
"@lookit/record": minor
"@lookit/style": minor
---

- Templates:
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
