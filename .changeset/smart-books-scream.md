---
"@lookit/record": patch
---

Add missing default value for video consent "additional_segments" parameter,
which was causing an error when this optional parameter was omitted (#84).
