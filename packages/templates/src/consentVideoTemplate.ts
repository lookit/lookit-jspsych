import { LookitWindow } from "@lookit/data/dist/types";
import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import consent_template_5 from "../hbs/consent-template-5.hbs";
import consentVideoTrialTemplate from "../hbs/consent-video-trial.hbs";
import { ConsentTemplateNotFound } from "./errors";
import { initI18nAndHelpers } from "./utils";

declare const window: LookitWindow;

const video_container_id = "lookit-jspsych-video-container";

/**
 * Translate, render, and get consent document HTML.
 *
 * @param trial - JsPsych trial object containing trial params
 * @returns Consent document HTML
 */
export const consentVideo = (trial: TrialType<PluginInfo>) => {
  const experiment = window.chs.study.attributes;
  const { PIName, PIContact } = trial;

  initI18nAndHelpers(trial);
  const consentDocumentTemplate = consentDocument(trial);

  const consent = Handlebars.compile(consentDocumentTemplate)({
    ...trial,
    name: PIName,
    contact: PIContact,
    experiment,
  });

  return Handlebars.compile(consentVideoTrialTemplate)({
    ...trial,
    consent,
    video_container_id,
  });
};

/**
 * Get consent template by name.
 *
 * @param trial - Trial data including user supplied parameters.
 * @returns Consent template
 */
const consentDocument = (trial: TrialType<PluginInfo>) => {
  switch (trial.template) {
    case "consent-template-5":
      return consent_template_5;
    default:
      throw new ConsentTemplateNotFound(trial.template);
  }
};
