import { JsPsychPlugin, PluginInfo } from "jspsych";
import { Class } from "type-fest";

export interface jsPsychPluginWithInfo
  extends Class<JsPsychPlugin<PluginInfo>> {
  info: PluginInfo;
}

/**
 * A valid CSS height/width value, which can be a number, a string containing a
 * number with units, or 'auto'.
 */
export type CSSWidthHeight =
  | number
  | `${number}${"px" | "cm" | "mm" | "em" | "%"}`
  | "auto";
