import { LookitWindow } from "@lookit/data/dist/types";
import { PluginInfo, TrialType } from "jspsych";
import { ConsentTemplateNotFound } from "./errors";
import chsTemplate from "./index";

declare const window: LookitWindow;

/**
 * Test helper function to create trial object.
 *
 * @param values - Object to replace default trial values
 * @returns Trial object
 */
const getTrial = (values: Record<string, string> = {}) => {
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
