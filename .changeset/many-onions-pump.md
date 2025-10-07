---
"@lookit/lookit-initjspsych": minor
---

Modify the on_data_update and on_finish (experiment) callbacks so that they do
not retrieve the response sequence from the lookit-api and send it back with the
response update request. The response sequence is now computed server-side, and
no response retrieval is needed on each data update/save.
