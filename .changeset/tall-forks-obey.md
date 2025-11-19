---
"@lookit/record": patch
"@lookit/surveys": patch
---

Add version and data to plugin/extension info. This adds the plugin version
number ("plugin_version") to the trial data, and fixes the console warnings
about missing version/data when the experiment loads. Also add "chs_version" to
data for CHS Survey plugins. The CHS Survey plugins extend the core survey
plugin and therefore already contain that "plugin_version" value in the data.
