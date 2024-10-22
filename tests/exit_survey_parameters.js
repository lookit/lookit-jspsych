const jsPsych = initJsPsych();

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

// Parameter variations for the exit survey
const exitSurvey = {
  type: chsSurvey.ExitSurveyPlugin,
  show_databrary_options: false,
  include_withdrawal_example: false,
  private_level_only: true,
  additional_video_privacy_text: "Here is some additional text!",
};

jsPsych.run([consentSurvey, trial, exitSurvey]);
