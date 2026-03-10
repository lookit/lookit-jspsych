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
const getTrial = (values: Record<string, string | boolean> = {}) => {
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
