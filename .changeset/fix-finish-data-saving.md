---
"@lookit/data": patch
"@lookit/lookit-initjspsych": patch
---

Makes end-of-experiment data saving more robust so that (1) a single failed API
request no longer aborts the rest of the finish-data-saving process, and (2)
transient failures of the final response-data save can recover.

`@lookit/data`: Settled API request promises are now removed from the internal
tracking array once they settle, so that a single earlier failed request no
longer causes every subsequent `Api.finish()` call to reject (previously this
could leave the participant stuck on the loading screen at the end of an
experiment, with the redirect and video uploads never completing).

`@lookit/lookit-initjspsych`: The final response data save in `on_finish` is now
retried 3 times with exponential backoff, so that a transient failure no longer
leaves a finished session marked as incomplete. The waits for response-data
saving and pending video uploads are now handled in separate try/catch blocks,
so that a failure in one no longer prevents the other from completing. Any
individual failed data/video uploads are now logged in the console. The
participant is also always redirected to the exit URL at the end, even if the
final data save (with multiple retries) does not succeed.
