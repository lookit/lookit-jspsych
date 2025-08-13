# Surveys

This package contains the custom surveys provided by CHS for jsPsych studies.
These surveys are built off of the very nice [jsPsych Survey
plugin]({{ jsPsych }}plugins/survey/).

## Parameters available in all plugins

**`locale` [String | "en-us"]**

Optional parameter to set a two-letter language code for translation. In some
cases, a regional code will have to be provided as well. For example, we
currently support English only from the US region. Therefore, to get the US
English translation you would put "en-US" for the locale. We support the
following language codes:

| Language       | Region | Code  |
| -------------- | ------ | ----- |
| Basque         |        | eu    |
| Dutch, Flemish |        | nl    |
| English        | U.S.A. | en-US |
| French         |        | fr    |
| Hungarian      |        | hu    |
| Italian        |        | it    |
| Japanese       |        | ja    |
| Portuguese     | Brazil | pt-BR |
| Portuguese     |        | pt    |

## Consent Survey

The Consent Survey will will give you two things out of the box:

- The API Response flags for `survey_consent` and `completed_consent_frame` will
  be set when the survey is completed.
- Support for Markdown will be added.

```javascript
const consentSurvey = { type: chsSurvey.ConsentSurveyPlugin };
```

Other than that, the rest of the survey is entirely designed by you. Please
refer to [jsPsych's Documentation]({{ jsPsych }}plugins/survey/) for the full
explanation on how to use their plugin.

## Exit Survey

Unlike the consent survey, this survey is already designed with a few parameters
for you to adjust to suit your study.

```javascript
const exitSurvey = { type: chsSurvey.ExitSurveyPlugin };
```

### Parameters

#### Optional

**`show_databrary_options` [Boolean | true]**

Show question about sharing collected data on Databrary.

**`include_withdrawal_example` [Boolean | true]**

Include an example in withdrawal question text.

**`private_level_only` [Boolean | false]**

Only show "private" on use of media question.

**`additional_video_privacy_text` [String | ""]**

Add custom video privacy text to privacy question.
