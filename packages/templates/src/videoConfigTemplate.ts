import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import videoConfigTemplate from "../hbs/video-config.hbs";
import { setLocale } from "./utils";

type VideoConfigTemplateParams = {
  webcam_container_id: string;
  reload_button_id_cam: string;
  camera_selection_id: string;
  mic_selection_id: string;
  step1_id: string;
  step2_id: string;
  step3_id: string;
  step_complete_class: string;
  reload_button_id_text: string;
  next_button_id: string;
  waiting_for_access_msg_id: string;
  checking_mic_msg_id: string;
  access_problem_msg_id: string;
  setup_problem_msg_id: string;
  chromeInitialPrompt: string;
  chromeAlwaysAllow: string;
  chromePermissions: string;
  firefoxInitialPrompt: string;
  firefoxChooseDevice: string;
  firefoxDevicesBlocked: string;
  checkmarkIcon: string;
};

/**
 * Get translated template for video config.
 *
 * @param trial - JsPsych trial object containing trial params
 * @param html_params - Additional context variables for the template.
 * @returns Video config HTML
 */
export const videoConfig = (
  trial: TrialType<PluginInfo>,
  html_params: VideoConfigTemplateParams,
) => {
  setLocale(trial);

  return Handlebars.compile(videoConfigTemplate)({
    ...trial,
    ...html_params,
  });
};
