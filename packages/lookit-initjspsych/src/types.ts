import { JsPsychExpData } from "@lookit/data/dist/types";
import { DataCollection } from "jspsych";
import { TrialDescription } from "jspsych/src/timeline";

export type UserFuncOnDataUpdate = (data: JsPsychExpData) => void;
export type UserFuncOnFinish = (data: DataCollection) => void;

export type JsPsychOptions = {
  on_data_update?: UserFuncOnDataUpdate;
  on_finish?: UserFuncOnFinish;
};

export type ChsTrialDescription = TrialDescription & {
  type: {
    chsData?: () => object;
  };
  data?: object;
};
