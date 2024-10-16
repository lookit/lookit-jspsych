import { LookitWindow } from "@lookit/data/dist/types";
import { PluginInfo, TrialType } from "jspsych";
import chsTemplate from "./index";

declare const window: LookitWindow;

test("consent video", () => {
  const trial = { locale: "en-us" } as unknown as TrialType<PluginInfo>;
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
  const trial = { locale: "fr" } as unknown as TrialType<PluginInfo>;
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
