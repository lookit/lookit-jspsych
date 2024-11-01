import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import uploadingVideoTemplate from "../hbs/uploading-video.hbs";
import { setLocale } from "./utils";

/**
 * Get translated template for uploading video message.
 *
 * @param trial - JsPsych trial object containing trial params
 * @returns Uploading video message HTML
 */
export const uploadingVideo = (trial: TrialType<PluginInfo>) => {
  setLocale(trial);

  return Handlebars.compile(uploadingVideoTemplate)({});
};
