import { Child } from "@lookit/lookit-api/dist/types";

export type ChildSubSet = {
  given_name: Child["attributes"]["given_name"];
  birthday: Child["attributes"]["birthday"];
  age_at_birth?: Child["attributes"]["age_at_birth"];
  additional_information?: Child["attributes"]["additional_information"];
};
