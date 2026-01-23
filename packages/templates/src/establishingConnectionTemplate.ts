import Handlebars from "handlebars";
import { PluginInfo, TrialType } from "jspsych";
import establishingConnectionTemplate from "../hbs/establishing-connection.hbs";
import { setLocale } from "./utils";

/**
 * Get translated template for establishing video connection message.
 *
 * @param trial - JsPsych trial object containing trial params
 * @returns Establishing connection message HTML
 */
export const establishingConnection = (trial: TrialType<PluginInfo>) => {
  setLocale(trial);

  return Handlebars.compile(establishingConnectionTemplate)({});
};
