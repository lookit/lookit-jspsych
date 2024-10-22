# Record

This package contains the plugins and extensions to record audio and/or video of
either a single trial or multiple trials.

## Video Configuration

To record _any_ video during an experiment, including a consent video, you must
add a video configuration trial. This trial allows the user to give permissions
and select the correct camera and microphone. This trial also does some basic
checks on the webcam and mic inputs, so that the participant can fix common
problems before the experiment starts.

Create a video configuration trial and put it in your experiment timeline prior
to any other trials that use the participant's webcam/microphone. The trial type
is `chsRecord.VideoConfigPlugin`.

```javascript
const videoConfig = { type: chsRecord.VideoConfigPlugin };
```

### Parameters

**`troubleshooting_intro` [HTML String]**

Optional text to add at the start of the "Setup tips and troubleshooting"
section. This string allows HTML formatting (e.g. `<strong></strong>` for bold,
`<em></em>` for italics).

### Examples

```javascript
const videoConfig = {
  type: chsRecord.VideoConfigPlugin,
  troubleshooting_intro:
    "If you're having any trouble getting your webcam set up, please feel free to call the XYZ lab at (123) 456-7890 and we'd be glad to help you out!",
};
```

## Trial Recording

To record a single trial, you will have to first load the extension in
`initJsPsych`.

```javascript
const jsPsych = initJsPsych({
  extensions: [{ type: chsRecord.TrialRecordExtension }],
});
```

Next, create a video configuration trial as described above. Then, add the trial
recoding extension parameter to your trial. By adding this extension, you can
record any trial you design.

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

You might prefer to record across multiple trials in a study session. This can
be done by using trials created with the start and stop recording plugins. This
gives a bit of flexibility over which of the study trials are recorded.

To record a study session, create the start and stop recording trials.

```javascript
const startRec = { type: chsRecord.StartRecordPlugin };
const stopRec = { type: chsRecord.StopRecordPlugin };
```

Next, create the trials that you would like to be recorded.

```javascript
const morning = { type: jsPsychHtmlKeyboardResponse, stimulus: "Good morning!" };
const evening = { type: jsPsychHtmlKeyboardResponse stimulus: "Good evening!" };
const night = { type: jsPsychHtmlKeyboardResponse, stimulus: "Good night!" };
```

Lastly, add these trials to the timeline. Again, the video configuration trial
must come before any other recording trials.

```javascript
jsPsych.run([videoConfig, startRec, morning, evening, night, stopRec]);
```

It's possible to record only some of the trials. This can be done by moving the
stop or start recording trials within the timeline.

```javascript
jsPsych.run([videoConfig, startRec, morning, evening, stopRec, night]);
```

## Video Consent

Users will need to record themselves accepting the consent document for your
study. This trial will allow the user to read the consent document and record a
video accepting it.

To create the video consent trial.

```javascript
const videoConsent = { type: chsRecord.VideoConsentPlugin, ...parameters };
```

### Example

```javascript
const videoConsent = {
  type: chsRecord.VideoConsentPlugin,
  PIName: "Jane Smith",
  institution: "Science University",
  PIContact: "Jane Smith at 123 456 7890",
  purpose:
    "Why do babies love cats? This study will help us find out whether babies love cats because of their soft fur or their twitchy tails.",
  procedures:
    "Your child will be shown pictures of lots of different cats, along with noises that cats make like meowing and purring. We are interested in which pictures and sounds make your child smile. We will ask you (the parent) to turn around to avoid influencing your child's responses.",
  risk_statement:
    "There are no expected risks if you participate in the study. (This is optional, but should typically be included. If you leave it out there's no 'risks' section and you should include risk information elsewhere.)",
  voluntary_participation:
    "There are two sessions in this study; you will be invited to complete another session next month. It is okay not to do both sessions! (This is optional; leave it out if you don't need to say anything besides participation in this session being voluntary.)",
  payment:
    "After you finish the study, we will email you a $5 BabyStore gift card within approximately three days. To be eligible for the gift card your child must be in the age range for this study, you need to submit a valid consent statement, and we need to see that there is a child with you. But we will send a gift card even if you do not finish the whole study or we are not able to use your child's data! There are no other direct benefits to you or your child from participating, but we hope you will enjoy the experience.",
  datause:
    "We are primarily interested in your child's emotional reactions to the images and sounds. A research assistant will watch your video to measure the precise amount of delight in your child's face as he or she sees each cat picture.",
  include_databrary: true,
  additional_video_privacy_statement:
    "We will also ask your permission to use your videos as stimuli for other parents. (This is optional; leave it out if there aren't additional ways you'll share video beyond as described in the participant's video privacy level and Databrary selections.)",
  gdpr: false,
  research_rights_statement:
    "You are not waiving any legal claims, rights or remedies because of your participation in this research study.  If you feel you have been treated unfairly, or you have questions regarding your rights as a research subject, you may contact the [IRB NAME], [INSTITUTION], [ADDRESS/CONTACT]",
  additional_segments: [
    {
      title: "US Patriot Act Disclosure",
      text: "[EXAMPLE ONLY, PLEASE REMOVE ADDITIONAL_SEGMENTS UNLESS YOU NEED THEM.] Lookit is a U.S. organization and all information gathered from the website is stored on servers based in the U.S. Therefore, your video recordings are subject to U.S. laws, such as the US Patriot Act. This act allows authorities access to the records of internet service providers. If you choose to participate in this study, you understand that your video recording will be stored and accessed in the USA. The security and privacy policy for Lookit can be found at the following link: <a href='https://lookit.mit.edu/privacy/' target='_blank' rel='noopener'>https://lookit.mit.edu/privacy/</a>.",
    },
  ],
};
```

### Parameters

Parameter names are shown below, along with their type and default value. If the
default value is _undefined_, then a value is required for that parameter.

#### Required

**`PIName` [String | _undefined_]**

Name of PI running this study.

**`institution` [String | _undefined_]**

Name of institution running this study (if ambiguous, list institution whose IRB
approved the study).

**`PIContact` [String | _undefined_]**

Contact information for PI or lab in case of participant questions or concerns.
This will directly follow the phrase “please contact”, so format accordingly:
e.g., “the XYZ lab at xyz@science.edu” or “Mary Smith at 123 456 7890”.

**`payment` [String | _undefined_]**

Statement about payment/compensation for participation, including a statement
that there are no additional benefits anticipated to the participant. E.g.,
“After you finish the study, we will email you a $5 BabyStore gift card within
approximately three days. To be eligible for the gift card your child must be in
the age range for this study, you need to submit a valid consent statement, and
we need to see that there is a child with you. But we will send a gift card even
if you do not finish the whole study or we are not able to use your child’s
data! There are no other direct benefits to you or your child from
participating, but we hope you will enjoy the experience.”

This section is by default titled “Are there any benefits to your family?”; it
should only include information about benefits and compensation. If your IRB
prefers to combine risk/benefit information, you can change this to something
like “What are the risks and benefits if you participate?” and include both
here, then omit the risk_statement.

**`procedures` [String | _undefined_]**

Brief description of study procedures. For consent templates 001 and 002, this
should include any risks or a statement that there are no anticipated risks.
(For consent template 003, that is included in payment). We add a statement
about the duration (from your study definition) to the start (e.g., “This study
takes about 10 minutes to complete”), so you don’t need to include that. It can
be in third person or addressed to the parent. E.g., “Your child will be shown
pictures of lots of different cats, along with noises that cats make like
meowing and purring. We are interested in which pictures and sounds make your
child smile. We will ask you (the parent) to turn around to avoid influencing
your child’s responses. There are no anticipated risks associated with
participating.”

**`purpose` [String | _undefined_]**

Brief description of purpose of study - 1-2 sentences that describe what you are
trying to find out. Language should be as straightforward and accessible as
possible! E.g., “Why do babies love cats? This study will help us find out
whether babies love cats because of their soft fur or their twitchy tails.”

#### Optional

**`locale` [String | "en-us"]**

Optional parameter to set a two-letter language code for translation. In some
cases, a regional code will have to be provided as well. For example, we
currently support english only from the US region. Therefore, to get the US
english translation you would put "en-US" for the locale. We support the
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

**`template` [String | "consent_005"]**

Which consent document template to use. If you are setting up a new study, we
recommend using the most recent (highest number) of these options. Options:
`consent_005`

**`additional_video_privacy_statement` [String | ""]**

Optional additional text for under header “Who can see our webcam recordings”.
For cases where researchers ask for other specific permission to share videos,
separate from the exit survey, or want to provide more detail or different
language about Databrary sharing.

**`datause` [String | ""]**

Optional study-specific data use statement. This will follow more general text
like: “The research group led by [PIName] at [institution] will have access to
video and other data collected during this session. We will also have access to
your account profile, demographic survey, and the child profile for the child
who is participating, including changes you make in the future to any of this
information. We may study your child’s responses in connection with his or her
previous responses to this or other studies run by our group, siblings’
responses to this or other studies run by our group, or demographic survey
responses.” (For exact text, please see specific template.)

You may want to note what measures you will actually be coding for (looking
time, facial expressions, parent-child interaction, etc.) and other more
specific information about your use of data from this study here. For instance,
you would note if you were building a corpus of naturalistic data that may be
used to answer a variety of questions (rather than just collecting data for a
single planned study).

**`gdpr` [Boolean | false]**

Whether to include a section on GDPR.

**`gdpr_personal_data` [String | ""]**

List of types of personal information collected, for GDPR section only. Do not
include special category information, which is listed separately.

**`gdpr_sensitive_data` [String | ""]**

List of types of special category information collected, for GDPR section only.
Include all that apply: racial or ethnic origin; political opinions; religious
or philosophical beliefs; trade union membership; processing of genetic data;
biometric data; health data; and/or sex life or sexual orientation information.

**`include_databrary` [Boolean | false]**

Whether to include a paragraph about Databrary under “Who can see our webcam
recordings?”.

**`private_level_only` [Boolean | false]**

Whether to describe only the “private” video privacy level under the heading
“Who will be able to see your webcam recordings?” Only use this option if your
IRB has a hard restriction against even offering participants the option to
share their videos more broadly, and in conjunction with the corresponding
restriction of options in the exit survey!

**`research_rights_statement` [String | ""]**

Statement about rights of research subjects and how to contact IRB. For
instance, MIT’s standard language is: You are not waiving any legal claims,
rights or remedies because of your participation in this research study. If you
feel you have been treated unfairly, or you have questions regarding your rights
as a research subject, you may contact [CONTACT INFO].

**`risk_statement` [String | ""]**

Optional statement; if provided, it is displayed under a header “Are there any
risks if you participate?”.

**`voluntary_participation` [String | ""]**

Optional additional text for under header “Participation is voluntary”. E.g.,
“There are two sessions in this study; you will be invited to complete another
session next month. It is okay not to do both sessions!”

#### Additional customization available if REQUIRED by your IRB

To accommodate a variety of idiosyncratic IRB requirements, various other fields
are technically customizable. Please start by trying to get approval for a
standard Lookit consent form, because it helps participants for the forms to
have common structure and language. If your IRB says no, you need to use their
usual form that’s 14 pages long, please explain that Lookit requires you to use
of one of our standard forms to ensure a smooth participant experience; this is
in the Terms of Use! If it really won’t be possible to use Lookit without making
more changes, please let us know before using the following fields to further
customize the consent form:

**`purpose_header` [String | ""]**

Custom alternate header for the section on study purpose.

**`procedures_header` [String | ""]**

Custom alternate header for the section on study procedures.

**`participation_header` [String | ""]**

Custom alternate header for the section on participation being voluntary.

**`benefits_header` [String | ""]**

Custom alternate header for the section on benefits/compensation.

**`risk_header` [String | ""]**

Custom alternate header for risks section.

**`summary_statement` [String | ""]**

Statement inserted at the beginning of the consent form, right after
“Researchers led by … are running this study … on Lookit.” Please only use this
if your IRB requires particular information to be included at the beginning of
the form; information is usually easier for participants to find under the
appropriate header rather than inserted here!

**`additional_segments` [Array]**

List of additional custom sections of the consent form, e.g. US Patriot Act
Disclosure or child abuse reporting obligation disclosure. These are subject to
Lookit approval and in general can only add information that was true anyway but
that your IRB needs explicitly listed.

Each section can have fields:

```javascript
{
  title: "title of section",
  text: "content of section"
}
```

**`prompt_all_adults` [Boolean | false]**

Whether to include an addition step #4 prompting any other adults present to
read a statement of consent (I have read and understand the consent document. I
also agree to participate in this study.)

**`prompt_only_adults` [Boolean | false]**

Whether to prompt only the adult for consent for themselves to participate,
rather than also referencing a child. This is for occasional studies running an
adult comparison group.

**`consent_statement_text` [String | ""]**

Replace the default spoken consent statement with your custom text.

**`omit_injury_phrase` [Boolean | false]**

Whether to omit the phrase “or in the very unlikely event of a research-related
injury” from the contact section. (This was required by the Northwestern IRB.)
