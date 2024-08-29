import { JsPsychExpData } from "@lookit/data/dist/types";
import { DataCollection } from "jspsych";

export type UserFuncOnDataUpdate = (data: JsPsychExpData) => void;
export type UserFuncOnFinish = (data: DataCollection) => void;

export type JsPsychOptions = {
  on_data_update?: UserFuncOnDataUpdate;
  on_finish?: UserFuncOnFinish;
};

export type Timeline = {
  type: {
    chsData?: () => object;
  };
  data?: object;
};
