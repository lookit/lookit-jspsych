import { LookitWindow } from "@lookit/data/dist/types";
import { PluginInfo, TrialType } from "jspsych";
import { ConsentTemplateNotFound } from "./errors";
import chsTemplate from "./index";

declare const window: LookitWindow;

test("consent video", () => {
  const trial = {
    locale: "en-us",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;
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
  const trial = {
    locale: "fr",
    template: "consent-template-5",
  } as unknown as TrialType<PluginInfo>;
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
  const trial = {
    locale: "en-us",
    template: "not a real template name",
  } as unknown as TrialType<PluginInfo>;
  expect(() => chsTemplate.consentVideo(trial)).toThrow(
    ConsentTemplateNotFound,
  );
});
