# CHS's initJsPsych

This package contains the repackaging of jsPsych's initjsPsych function. We needed to give ourselves the ability to do two things:

 - Validate the trial timeline.
 - Record trial data to CHS's API.

## chsInitJsPsych

This function will make available `initJsPsych()` and it can be expected to operate as the original.

```javascript
initJsPsych = chsInitJsPsych(responseUuid);
```

The above code is already placed into the experiment before your code. For transparency, you can always find `chsInitJsPsych()` on [npmjs](https://www.npmjs.com/package/@lookit/lookit-initjspsych?activeTab=code), [github](https://github.com/lookit/lookit-jspsych/tree/main/packages/lookit-initjspsych/src), and [unpkg](https://unpkg.com/browse/@lookit/lookit-initjspsych/src/).  Please feel free to reach out with any questions or concerns.
