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
