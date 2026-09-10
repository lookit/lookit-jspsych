---
"@lookit/templates": minor
"@lookit/record": minor
---

This update adds the new `additional_recording_outside_chs` parameter to the
video consent plugin (record package). The parameter defaults to `false`. If set
to `true`, it will modify some of the wording in the consent template (either
consent-template-5 or consent-recording-only) to make it clear that the
statements apply only to recordings made on CHS. Specifically, it will (1) add
qualifiers to mentions of recordings ("CHS recordings", "recordings made on
CHS"), and (2) add a statement to the data collection section: "Other parts of
this study take place outside of CHS, where you and your child may also be
recorded. This consent form describes only the recordings made on CHS."

This also updates the record package documentation so that the different
README.md sections appear as separate pages, and it adds the specific word
changes associated with (1) the "consent-recording-only" template, (2) the use
of `only_consent_on_chs: true`, and (3) the use of
`additional_recording_outside_chs: true`.
