const jsPsych = initJsPsych();

// This is a custom consent survey. It uses the jsPsych survey plugin
// which creates a survey using 'survey_json' and/or 'survey_function' parameters.
// The plugin uses SurveyJS. See the jsPsych docs and SurveyJS docs for all question types and options.
// https://www.jspsych.org/latest/plugins/survey/
// https://surveyjs.io/form-library/documentation/overview
const consentSurvey = {
  type: chsSurvey.ConsentSurveyPlugin,
  survey_json: {
    elements: [
      {
        isRequired: true,
        name: "ParticipateBoolean",
        title: "Would you like to participate in this study?",
        type: "boolean",
        valueFalse: "no",
        valueTrue: "yes",
        validators: [
          {
            type: "expression",
            text: "You must first agree to participate in order to continue with the study.",
            expression: "{ParticipateBoolean}='yes'",
          },
        ],
      },
      {
        type: "checkbox",
        name: "UnderstandVoluntary",
        title: "Please check the box to confirm.",
        choices: {
          value: "yes",
          text: "I understand that my participation in this study is voluntary.",
        },
        isRequired: true,
        showTitle: true,
      },
    ],
    showQuestionNumbers: false,
    checkErrorsMode: "onValueChanged",
    textUpdateMode: "onTyping",
  },
};

const trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus:
    "<p>This is a jsPsych study running on CHS!</p><p>Press any key to end the study.</p>",
};

const exitSurvey = {
  type: chsSurvey.ExitSurveyPlugin,
};

jsPsych.run([consentSurvey, trial, exitSurvey]);
