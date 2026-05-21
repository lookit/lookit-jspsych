const jsPsych = initJsPsych();

const videoConfig = {
  type: chsRecord.VideoConfigPlugin,
};

// Parameter variations for the video assent plugin
// Minimal version with defaults, no recording
const videoAssent = {
  type: chsRecord.VideoAssentPlugin,
  pages: [{ stimulus: "This is some study information." }],
};

// Custom button labels and participation question, no recording
const videoAssentCustomButtonsAndQuestion = {
  type: chsRecord.VideoAssentPlugin,
  pages: [{ stimulus: "This is some study information." }],
  participation_question: "Are you in?!",
  next_button: ">>",
  previous_button: "<<",
  yes_button: "Yep!",
  no_button: "Nope!",
  continue_button: "Move on",
};

const videoAssentShowWebcam = {
  type: chsRecord.VideoAssentPlugin,
  pages: [
    { stimulus: "1. This is some study information." },
    {
      stimulus: "2. This is some study information along with the webcam feed.",
      show_webcam: true,
    },
    { stimulus: "3. This is some study information." },
  ],
};

const videoAssentRecordLastPage = {
  type: chsRecord.VideoAssentPlugin,
  pages: [
    { stimulus: "1. This is some study information." },
    { stimulus: "2. This is some study information." },
    {
      stimulus: "3. This is some study information along with the webcam feed.",
      show_webcam: true,
    },
  ],
  record_last_page: true,
};

const videoAssentRecordWholeProcedure = {
  type: chsRecord.VideoAssentPlugin,
  pages: [
    { stimulus: "1. This is some study information." },
    {
      stimulus: "2. This is some study information along with the webcam feed.",
      show_webcam: true,
    },
    { stimulus: "3. This is some study information." },
  ],
  record_whole_procedure: true,
};

const exitSurvey = {
  type: chsSurvey.ExitSurveyPlugin,
};

jsPsych.run([
  videoConfig,
  videoAssent,
  videoAssentCustomButtonsAndQuestion,
  videoAssentShowWebcam,
  videoAssentRecordLastPage,
  videoAssentRecordWholeProcedure,
  exitSurvey,
]);
