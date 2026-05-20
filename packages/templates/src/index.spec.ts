import { LookitWindow } from "@lookit/data/dist/types";
import { PluginInfo, TrialType } from "jspsych";
import { html_params } from "../../record/src/videoConfig";
import { ConsentTemplateNotFound } from "./errors";
import chsTemplate from "./index";

declare const window: LookitWindow;

/**
 * Test helper function to create trial object.
 *
 * @param values - Object to replace default trial values
 * @returns Trial object
 */
const getTrial = (values: Record<string, unknown> = {}) => {
  return {
    locale: "en-us",
    template: "consent-template-5",
    ...values,
  } as unknown as TrialType<PluginInfo>;
};

test("consent video", () => {
  const trial = getTrial();
  const name = "some name";
  window.chs = {
    study: {
      attributes: {
        name,
        duration: "duration",
      },
    },
  } as typeof window.chs;

  expect(chsTemplate.consentVideo(trial)).toContain(
    '<div id="consent-video-trial">',
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `Consent to participate in research:\n  ${name}`,
  );
});

test("consent video in French", () => {
  const trial = getTrial({ locale: "fr" });
  const name = "some name";
  window.chs = {
    study: {
      attributes: {
        name,
        duration: "duration",
      },
    },
  } as typeof window.chs;

  expect(chsTemplate.consentVideo(trial)).toContain(
    '<div id="consent-video-trial">',
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `Consentement à participer à la recherche:\n  ${name}`,
  );
});

test("consent video with unknown template", () => {
  const trial = getTrial({
    template: "not a real template name",
  });
  expect(() => chsTemplate.consentVideo(trial)).toThrow(
    ConsentTemplateNotFound,
  );
});

test("consent garden template", () => {
  const trial = getTrial({ template: "consent-garden" });
  expect(chsTemplate.consentVideo(trial)).toContain("Project GARDEN");
});

test("consent video with consent-recording-only template", () => {
  const trial = getTrial({ template: "consent-recording-only" });
  const name = "some name";
  window.chs = {
    study: {
      attributes: {
        name,
        duration: "duration",
      },
    },
  } as typeof window.chs;

  expect(chsTemplate.consentVideo(trial)).toContain(
    '<div id="consent-video-trial">',
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `You and your child will be recorded by your computer&#x27;s webcam and microphone only while providing verbal consent.`,
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `This webcam recording and other data collected on the CHS/Lookit website are sent securely to the Lookit platform.`,
  );
  expect(chsTemplate.consentVideo(trial)).not.toContain(
    `You will also have the option to withdraw your recordings. If you do, only your consent recording will be kept and all other recordings will be deleted.`,
  );
});

test("consent video with consent-recording-only template and only consent on CHS", () => {
  const trial = getTrial({
    template: "consent-recording-only",
    only_consent_on_chs: true,
  });
  const name = "some name";
  window.chs = {
    study: {
      attributes: {
        name,
        duration: "duration",
      },
    },
  } as typeof window.chs;

  expect(chsTemplate.consentVideo(trial)).toContain(
    '<div id="consent-video-trial">',
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `You and your child will be recorded by your computer&#x27;s webcam and microphone only while providing verbal consent.`,
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `This webcam recording is sent securely to the Lookit platform.`,
  );
  expect(chsTemplate.consentVideo(trial)).not.toContain(
    `You will also have the option to withdraw your recordings. If you do, only your consent recording will be kept and all other recordings will be deleted.`,
  );
});

test("video consent param only_consent_on_chs is ignored when the template is not consent-recording-only", () => {
  const trial = getTrial({
    only_consent_on_chs: true,
  });
  const name = "some name";
  window.chs = {
    study: {
      attributes: {
        name,
        duration: "duration",
      },
    },
  } as typeof window.chs;

  expect(chsTemplate.consentVideo(trial)).toContain(
    '<div id="consent-video-trial">',
  );
  expect(chsTemplate.consentVideo(trial)).not.toContain(
    `You and your child will be recorded by your computer&#x27;s webcam and microphone only while providing verbal consent.`,
  );
  expect(chsTemplate.consentVideo(trial)).not.toContain(
    `This webcam recording is sent securely to the Lookit platform.`,
  );
  expect(chsTemplate.consentVideo(trial)).toContain(
    `You will also have the option to withdraw your recordings. If you do, only your consent recording will be kept and all other recordings will be deleted.`,
  );
});

test("video config template", () => {
  const trial = getTrial();

  expect(chsTemplate.videoConfig(trial, html_params)).toContain(
    '<div id="lookit-jspsych-video-config">',
  );
  expect(chsTemplate.videoConfig(trial, html_params)).toContain(
    `<h2>Webcam setup</h2>`,
  );
});

test("video config template in Italian", () => {
  const trial = getTrial({ locale: "it" });

  expect(chsTemplate.videoConfig(trial, html_params)).toContain(
    '<div id="lookit-jspsych-video-config">',
  );
  expect(chsTemplate.videoConfig(trial, html_params)).toContain(
    `<h2>Configurazione della webcam</h2>`,
  );
});

test("uploading video template", () => {
  const trial = getTrial();

  expect(chsTemplate.uploadingVideo(trial)).toContain(
    "<div>uploading video, please wait...</div>",
  );
});

test("uploading video template in Portuguese", () => {
  const trial = getTrial({ locale: "pt" });

  expect(chsTemplate.uploadingVideo(trial)).toContain(
    "<div>enviando vídeo, por favor, aguarde...</div>",
  );
});

test("exit survey template", () => {
  const trial = getTrial({ private_level_only: true });
  const survey = chsTemplate.exitSurvey(trial);
  expect(survey.pages[0].elements[0].description).toStrictEqual(
    "We ask again just to check for typos during registration or accidental selection of a different child at the start of the study.",
  );
});

test("exit survey template in French", () => {
  const trial = getTrial({ locale: "fr" });
  const survey = chsTemplate.exitSurvey(trial);
  expect(survey.pages[0].elements[0].description).toStrictEqual(
    "Nous vous demandons à nouveau en cas d'erreur lors de l'enregistrement ou de sélection par erreur d'un enfant différent au début de l'étude.",
  );
});

test("estabilshing connection template", () => {
  const trial = getTrial();

  expect(chsTemplate.establishingConnection(trial)).toContain(
    "<div>establishing video connection, please wait...</div>",
  );
});

test("establishing connection template in French", () => {
  const trial = getTrial({ locale: "fr" });

  expect(chsTemplate.establishingConnection(trial)).toContain(
    "<div>en attente de connection video, veuillez attendre...</div>",
  );
});

const assentIds = {
  video_container_id: "test-video-container",
  msg_container_id: "test-msg-container",
  page_container_id: "test-page-container",
  resp_btn_container_id: "test-resp-btn-container",
  pages_nav_container_id: "test-pages-nav-container",
  no_resp_msg_container_id: "test-no-resp-msg-container",
};

test("assent video template renders main container", () => {
  const trial = getTrial({
    participation_question: "Do you want to participate?",
    pages: [{ stimulus: "page 1" }],
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain('<div id="assent-video-trial">');
});

test("assent video template uses provided element IDs", () => {
  // pass at least two pages, otherwise the pages nav container will not be shown
  const trial = getTrial({
    pages: [{ stimulus: "page 1" }, { stimulus: "page 2" }],
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain('id="test-video-container"');
  expect(result).toContain('id="test-msg-container"');
  expect(result).toContain('id="test-page-container"');
  expect(result).toContain('id="test-resp-btn-container"');
  expect(result).toContain('id="test-pages-nav-container"');
});

test("assent video template renders participation_question", () => {
  const question = "Would you like to be in our study?";
  const trial = getTrial({
    pages: [{ stimulus: "page 1" }],
    previous_button: "Back",
    next_button: "Forward",
    participation_question: question,
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain(question);
});

test("assent video template renders custom button labels from trial params", () => {
  // pass at least two pages, otherwise the pages nav container will not be shown
  const trial = getTrial({
    pages: [{ stimulus: "page 1" }, { stimulus: "page 2" }],
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain("Back");
  expect(result).toContain("Forward");
});

test("assent video template includes checkmark icon src", () => {
  const trial = getTrial({
    pages: [{ stimulus: "page 1" }, { stimulus: "page 2" }],
  });

  test("assent video template renders default parent_intro_text in English", () => {
    const trial = getTrial({ pages: [{ stimulus: "page 1" }] });
    const result = chsTemplate.assentVideo(
      trial,
      "checkmark.png",
      "xmark.png",
      assentIds,
    );
    expect(result).toContain("This page is for the");
    expect(result).toContain("Parents, please help your child");
  });

  test("assent video template renders default parent_intro_text in French", () => {
    const trial = getTrial({ locale: "fr", pages: [{ stimulus: "page 1" }] });
    const result = chsTemplate.assentVideo(
      trial,
      "checkmark.png",
      "xmark.png",
      assentIds,
    );
    expect(result).toContain("Cette page est pour l");
    expect(result).toContain("enfant");
  });

  test("assent video template uses provided parent_intro_text instead of default", () => {
    const trial = getTrial({
      pages: [{ stimulus: "page 1" }],
      parent_intro_text: "<p>Custom intro for parents.</p>",
    });
    const result = chsTemplate.assentVideo(
      trial,
      "checkmark.png",
      "xmark.png",
      assentIds,
    );
    expect(result).toContain("Custom intro for parents.");
    expect(result).not.toContain("This page is for the");
  });

  test("assent video template renders default no_response_message hidden in English", () => {
    const trial = getTrial({ pages: [{ stimulus: "page 1" }] });
    const result = chsTemplate.assentVideo(
      trial,
      "checkmark.png",
      "xmark.png",
      assentIds,
    );
    expect(result).toContain(
      '<div id="test-no-resp-msg-container" style="visibility:hidden">',
    );
    expect(result).toContain("You have chosen not to participate");
  });

  test("assent video template uses custom no_response_message instead of default", () => {
    const trial = getTrial({
      pages: [{ stimulus: "page 1" }],
      no_response_message: "<p>Custom no-response message.</p>",
    });
    const result = chsTemplate.assentVideo(
      trial,
      "checkmark.png",
      "xmark.png",
      assentIds,
    );
    expect(result).toContain(
      '<div id="test-no-resp-msg-container" style="visibility:hidden">',
    );
    expect(result).toContain("Custom no-response message.");
    expect(result).not.toContain("You have chosen not to participate");
  });
  const result = chsTemplate.assentVideo(
    trial,
    "my-checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain('src="my-checkmark.png"');
});

test("assent video template shows not-recording message in English", () => {
  const trial = getTrial({
    pages: [{ stimulus: "page 1" }, { stimulus: "page 2" }],
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain("Not recording");
});

test("assent video template shows not-recording message in French", () => {
  const trial = getTrial({
    locale: "fr",
    pages: [{ stimulus: "page 1" }, { stimulus: "page 2" }],
  });
  const result = chsTemplate.assentVideo(
    trial,
    "checkmark.png",
    "xmark.png",
    assentIds,
  );
  expect(result).toContain("Pas en cours d&#x27;enregistrement"); // Not recording
});
