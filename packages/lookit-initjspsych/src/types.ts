import { JsPsychExpData } from "@lookit/data/dist/types";
import {
  DataCollection,
  JsPsych as OriginalJsPsych,
  JsPsychPlugin,
} from "jspsych";
import {
  PluginInfo,
  UniversalPluginParameters,
} from "jspsych/src/modules/plugins";
import { TimelineDescription, TrialDescription } from "jspsych/src/timeline";

export type UserFuncOnDataUpdate = (data: JsPsychExpData) => void;
export type UserFuncOnFinish = (data: DataCollection) => void;

export type JsPsychOptions = {
  on_data_update?: UserFuncOnDataUpdate;
  on_finish?: UserFuncOnFinish;
};

// Add chsData to JsPsychPlugin type
export type ChsJsPsychPlugin = JsPsychPlugin<PluginInfo> &
  UniversalPluginParameters & {
    chsData?: () => object;
  };

// Modify trial description to allow for plugin classes with chsData
export interface ChsTrialDescription extends Omit<TrialDescription, "type"> {
  type: ChsJsPsychPlugin;
}

// Modify timeline description to allow for plugin classes with chsData
export interface ChsTimelineDescription
  extends Omit<TimelineDescription, "timeline"> {
  timeline: ChsTimelineArray;
}

// Modify timeline array to allow for plugin classes with chsData
export type ChsTimelineArray = Array<
  ChsTimelineDescription | ChsTrialDescription | ChsTimelineArray
>;

export interface ChsJsPsych extends Omit<OriginalJsPsych, "run"> {
  run(timeline: ChsTimelineDescription | ChsTimelineArray): Promise<void>;
}
