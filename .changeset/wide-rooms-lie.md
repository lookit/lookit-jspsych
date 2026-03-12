---
"@lookit/lookit-initjspsych": minor
---

Adds URL parameters to the study exit URL: 'child', which is the CHS child ID,
and 'response', which is the CHS response ID. If the study exit URL is invalid,
it checks for a missing `https://` prefix before falling back to the CHS domain.
Adds tests for handling invalid URLs and for URLs that have existing query
parameters.
