import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import assent_video from "../hbs/assent-video.hbs";
import { setLocale } from "./utils";

export interface AssentVideoIds {
  video_container_id: string;
  msg_container_id: string;
  page_container_id: string;
  resp_btn_container_id: string;
  pages_nav_container_id: string;
}

export interface AssentVideoBtnLabels {
  yes_btn: string;
  no_btn: string;
  next_btn: string;
  prev_btn: string;
  done_btn: string;
}

/**
 * Translate, render, and get consent document HTML.
 *
 * @param trial - JsPsych trial object containing trial params
 * @param checkmarkIcon - Path to the checkmark icon image
 * @param xIcon - Path to the x mark icon image
 * @param ids - Element ID strings for the containers used in the template
 * @param btnLabels - Labels for the yes, no, next, previous, and done buttons
 * @returns Consent document HTML
 */
export const assentVideo = (
  trial: TrialType<PluginInfo>,
  checkmarkIcon: string,
  xIcon: string,
  ids: AssentVideoIds,
  btnLabels: AssentVideoBtnLabels,
) => {
  setLocale(trial);

  const multiplePages = trial.pages.length > 2;

  return Handlebars.compile(assent_video)({
    ...trial,
    checkmarkIcon,
    xIcon,
    ...ids,
    ...btnLabels,
    multiplePages,
  });
};
