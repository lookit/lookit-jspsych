# Record

This package contains the plugins and extensions to record audio and/or video of either a single trial or multiple trials.

## Initialize Camera

To record video, you will have to add a trial that allows the user to give permissions and select the correct camera.

```javascript
const initCamera = { type: jsPsychInitializeCamera };
```

To enable audio you will have to set the `include_audio` parameter.

```javascript
const initCamera = { type: jsPsychInitializeCamera, include_audio: true };
```

See [jsPsych's initialize-camera]({{ jsPsych }}plugins/initialize-camera/#initialize-camera) docs for more information.

## Intialize Microphone

To record audio, just as with video, you will have to add a trial.

```javascript
const initMicrophone = { type: jsPsychInitializeMicrophone };
```

See [jsPsych's initialize-microphone]({{ jsPsych }}plugins/initialize-microphone/#initialize-microphone) docs for more information.

## Trial Recording

To record a single trial, you will have to first load the extension in `initJsPsych`.

```javascript
const jsPsych = initJsPsych({
  extensions: [{ type: chsRecord.TrialRecordExtension }],
});
```

Next, initialize the camera/microphone as described above. For now, we'll use the camera initialization. Add trial recording to the extensions parameter of the trial that needs to be recorded. Any trial you design can be recorded by add this extension.

```javascript
const trialRec = {
  // ... Other trial paramters ...
  extensions: [{ type: chsRecord.TrialRecordExtension }],
};
```

Finally, insert the trials into the timeline.

```javascript
jsPsych.run([initCamera, trialRec]);
```

## Session Recording

You might prefer to record across multiple trials in a study session. This can be done by using trials created with the start and stop recording plugins. This gives a bit of flexibility over which of the study trials are recorded.

To record a study session, create the start and stop recording trials.

```javascript
const startRec = { type: chsRecord.StartRecordPlugin };
const stopRec = { type: chsRecord.StopRecordPlugin };
```

Next, create the trials that would like to be recorded.

```javascript
const morning = {type: jsPsychHtmlKeyboardResponse, stimulus: "Good morning!"};
const evening = {type: jsPsychHtmlKeyboardResponse stimulus: "Good evening!"};
const night = { type: jsPsychHtmlKeyboardResponse, stimulus: "Good night!" };
```

Lastly, add these trials to the timeline.

```javascript
jsPsych.run([initCamera, startRec, morning, evening, night, stopRec]);
```

It's possible to record only some of the trials. This can be done by moving the stop or start recording trials within the timeline.

```javascript
jsPsych.run([initCamera, startRec, morning, evening, stopRec, night]);
```
