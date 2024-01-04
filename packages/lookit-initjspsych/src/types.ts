import { DataCollection } from "jspsych/dist/modules/data/DataCollection";

export type UserFunc = (data: DataCollection) => void;

export type ResponseData = {
  id: string;
  type: "responses";
  attributes: {
    exp_data: DataCollection[];
    completed?: boolean;
  };
};

export type JsPsychOptions = {
  on_data_update?: UserFunc;
  on_finish?: UserFunc;
};
