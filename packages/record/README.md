# Record

This package contains the plugins and extensions to record audio and/or video of either a single trial or multiple trials.

## Video Configuration

To record any video during an experiment, including a consent video, you will have to add a video configuration trial that allows the user to give permissions and select the correct camera and microphone. This trial also does some basic checks on the webcam and mic inputs, so that the participant can fix common problems before the experiment starts.

Create a video configuration trial and put it in your experiment timeline prior to any other trials that use the participant's webcam/microphone. The trial type is `chsRecord.VideoConfigPlugin`.

```javascript
const videoConfig = { type: chsRecord.VideoConfigPlugin };
```

## Trial Recording

To record a single trial, you will have to first load the extension in `initJsPsych`.

```javascript
const jsPsych = initJsPsych({
  extensions: [{ type: chsRecord.TrialRecordExtension }],
});
```

Next, create a video configuration trial as described above. Add trial recording to the extensions parameter of the trial that needs to be recorded. Any trial you design can be recorded by add this extension.

```javascript
const trialRec = {
  // ... Other trial paramters ...
  extensions: [{ type: chsRecord.TrialRecordExtension }],
};
```

Finally, insert the trials into the timeline.

```javascript
jsPsych.run([videoConfig, trialRec]);
```

## Session Recording

You might prefer to record across multiple trials in a study session. This can be done by using trials created with the start and stop recording plugins. This gives a bit of flexibility over which of the study trials are recorded.

To record a study session, create the start and stop recording trials.

```javascript
const startRec = { type: chsRecord.StartRecordPlugin };
const stopRec = { type: chsRecord.StopRecordPlugin };
```

Next, create the trials that you would like to be recorded.

```javascript
const morning = {type: jsPsychHtmlKeyboardResponse, stimulus: "Good morning!"};
const evening = {type: jsPsychHtmlKeyboardResponse stimulus: "Good evening!"};
const night = { type: jsPsychHtmlKeyboardResponse, stimulus: "Good night!" };
```

Lastly, add these trials to the timeline. Again, the video configuration trial must come before any other recording trials.

```javascript
jsPsych.run([videoConfig, startRec, morning, evening, night, stopRec]);
```

It's possible to record only some of the trials. This can be done by moving the stop or start recording trials within the timeline.

```javascript
jsPsych.run([videoConfig, startRec, morning, evening, stopRec, night]);
```
