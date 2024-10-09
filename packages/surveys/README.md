# Surveys

This package contains the custom surveys provided by CHS for jsPsych studies.
These surveys are built off of the very nice [jsPsych
Survey plugin]({{ jsPsych }}plugins/survey/).

## Consent Survey

The Consent Survey will will give you two things out of the box:

- The API Response flags for `survey_consent` and `completed_consent_frame` will
  be set when the survey is completed.
- Support for Markdown will be added.

```javascript
const consentSurvey = { type: chsSurvey.ConsentSurveyPlugin };
```

Other than that, the rest of the survey is entirely designed by you. Please
refer to [jsPsych's Documentation]({{ jsPsych }}plugins/survey/) for the full explanation
on how to use their plugin.

## Exit Survey

Unlike the consent survey, this survey is already designed with a few parameters
for you to adjust to suit your study.

```javascript
const exitSurvey = { type: chsSurvey.ExitSurveyPlugin };
```

### Parameters

| Parameter                     | Type    | Default Value | Description                                              |
| ----------------------------- | ------- | ------------- | -------------------------------------------------------- |
| show_databrary_options        | boolean | true          | Show question about sharing collected data on Databrary. |
| include_withdrawal_example    | boolean | true          | Include an example in withdrawal question text.          |
| private_level_only            | boolean | false         | Only show "private" on use of media question.            |
| additional_video_privacy_text | string  | ""            | Add custom video privacy text to privacy question.       |
