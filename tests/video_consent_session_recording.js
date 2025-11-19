const jsPsych = initJsPsych();

const videoConfig = {
  type: chsRecord.VideoConfigPlugin,
  troubleshooting_intro: "Contact Becky Gilbert if you're having problems!",
};

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

const startRec = {
  type: chsRecord.StartRecordPlugin,
};

const trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus:
    "<p>This is a jsPsych study running on CHS!</p><p>Press any key to end the study.</p>",
};

const stopRec = {
  type: chsRecord.StopRecordPlugin,
};

const exitSurvey = {
  type: chsSurvey.ExitSurveyPlugin,
};

jsPsych.run([
  videoConfig,
  videoConsent,
  startRec,
  trial,
  stopRec,
  startRec,
  trial,
  stopRec,
  exitSurvey,
]);
