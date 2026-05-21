import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import assent_video from "../hbs/assent-video.hbs";
import { setLocale, translateString } from "./utils";

export interface AssentVideoIds {
  video_container_id: string;
  msg_container_id: string;
  page_container_id: string;
  resp_btn_container_id: string;
  pages_nav_container_id: string;
  no_resp_msg_container_id: string;
}

/**
 * Translate, render, and get assent document HTML.
 *
 * @param trial - JsPsych trial object containing trial params
 * @param checkmarkIcon - Path to the checkmark icon image
 * @param xIcon - Path to the x mark icon image
 * @param ids - Element ID strings for the containers used in the template
 * @returns Assent document HTML
 */
export const assentVideo = (
  trial: TrialType<PluginInfo>,
  checkmarkIcon: string,
  xIcon: string,
  ids: AssentVideoIds,
) => {
  setLocale(trial);

  // Whether or not to show the previous/next page nav buttons
  const multiplePages = trial.pages.length > 1;

  // Use default labels/text, unless an override has been set in the trial object.
  const yes_btn = trial.yes_button ?? translateString("Yes");
  const no_btn = trial.no_button ?? translateString("No");
  const next_btn = trial.next_button ?? translateString("Next");
  const prev_btn = trial.previous_button ?? translateString("Previous");
  const done_btn = trial.continue_button ?? translateString("Continue");
  const parent_intro_text =
    trial.parent_intro_text ??
    `<h1>${translateString("exp-lookit-video-assent.header")}</h1><p>${translateString("exp-lookit-video-assent.explanation-1")}<br>${translateString("exp-lookit-video-assent.explanation-2")}</p>`;
  const no_response_message =
    trial.no_response_message ??
    translateString("exp-lookit-video-assent.chose-not-to-participate");

  return Handlebars.compile(assent_video)({
    ...trial,
    checkmarkIcon,
    xIcon,
    ...ids,
    multiplePages,
    yes_btn,
    no_btn,
    next_btn,
    prev_btn,
    done_btn,
    parent_intro_text,
    no_response_message,
  });
};
