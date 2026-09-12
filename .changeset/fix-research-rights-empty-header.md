---
"@lookit/templates": minor
---

Remove the text "This consent form describes only the recordings made on CHS."
from the additional_recording_outside_chs variants of the consent templates, in
case researchers want the CHS consent form to cover the non-CHS portions of the
study as well.

Fix the video consent templates (consent-template-5 and consent-recording-only)
so that the "Rights of research subjects" header is only rendered when the
`research_rights_statement` parameter is provided. Previously the section header
always appeared, leaving an empty heading with no content beneath it when the
parameter was left at its default (`""`).
