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

/** Options for the stop method */
export interface StopOptions {
  maintain_container_size?: boolean;
  stop_timeout_ms?: number | null;
  upload_timeout_ms?: number | null;
}

/** Result returned by the stop method */
export interface StopResult {
  /**
   * Promise that resolves with the URL when the recorder has fully stopped.
   * Returns a string with either the completion URL or "timeout".
   */
  stopped: Promise<string>;
  /**
   * Promise that resolves when the upload (or local download) completes.
   * Returns void if succeeds or "timeout" if times out.
   */
  uploaded: Promise<void | string>;
}
