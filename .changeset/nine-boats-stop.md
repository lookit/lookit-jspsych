---
"@lookit/templates": minor
"@lookit/record": minor
"@lookit/style": minor
---

This update adds the video assent plugin to the `Record` package
(`chsRecord.VideoAssentPlugin`). This plugin uses a new assent video template in
the `Templates` package, which can be accessed via `chsTemplates.assentVideo`.
The style package was updated with the CSS for the video assent plugin.
Documentation can be found in the `Record` package section on the CHS jsPsych
documentation page:
https://lookit.readthedocs.io/projects/chs-jspsych/en/latest/record/. Other
minor changes:

- The `Templates` package now exposes `setLocale`, in case plugins need to
  translate default text before passing it into a template function.
  (`setLocale` is still called inside all template functions and does not need
  to be added when this pre-translation step is not needed.)
- Installs Jest types and adds them to TS config files.
- Adds tests for new features and changes.
