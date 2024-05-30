# CHS's initjsPsych

This package contains the repackaging of jsPsych's initjsPsych function. We needed to give ourselves the ability to do two things:

 - Validate the trial timeline.
 - Record trial data to CHS's API.

## chsInitJsPsych

This function will make available `initJsPsych()` and it can be expected to operate as the original.

```javascript
initJsPsych = chsInitJsPsych(responseUuid);
```

The above code is already placed into the experiment before your code. For transparency, you can always find `chsInitJsPsych()` on [npmjs]({{ lookitInitJsPsych.npmjs }}), [github]({{ lookitInitJsPsych.github }}), and [unpkg]({{ lookitInitJsPsych.unpkg }}).  Please feel free to reach out with any questions or concerns.
