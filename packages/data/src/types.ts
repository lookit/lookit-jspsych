import { DataCollection } from "jspsych/dist/modules/data/DataCollection";

export type Promises = Promise<Data<Attributes> | Data<Attributes>[]>;

export type Relationship = {
  links: {
    related: string;
  };
};

export type Attributes = {
  readonly pk?: number;
  readonly url?: string;
};

export interface Relationships {}

export interface StudyAttrs extends Attributes {
  name: string;
  short_description: string;
  purpose: string;
  criteria: string;
  duration: string;
  contact_info: string;
  /** Format: binary */
  image?: string | null;
  structure?: Record<string, never>;
  generator?: string;
  use_generator?: boolean;
  display_full_screen?: boolean;
  /** Format: uri */
  exit_url?: string;
  /** @enum {string} */
  state?:
    | "created"
    | "submitted"
    | "rejected"
    | "retracted"
    | "approved"
    | "active"
    | "paused"
    | "deactivated"
    | "archived";
  public?: boolean;
  responses: string[];
}

export interface ChildAttrs extends Attributes {
  given_name: string;
  birthday: string;
  gender: "m" | "f" | "o" | "na";
  readonly age_at_birth?: string;
  additional_information?: string;
  readonly language_list?: string;
  readonly condition_list?: string;
  deleted?: boolean;
  former_lookit_profile_id?: string;
  readonly pk?: number;
}

export interface PastSessionAttrs extends Attributes {
  conditions?: Record<string, never>;
  global_event_timings?: Record<string, never>;
  exp_data?: DataCollection[];
  sequence?: string[];
  completed?: boolean;
  completed_consent_frame?: boolean;
  survey_consent?: boolean;
  readonly created_on?: string;
  is_preview?: boolean;
  readonly hash_child_id?: string;
  recording_method?: string;
  eligibility?: (
    | "Eligible"
    | "Ineligible_TooYoung"
    | "Ineligible_TooOld"
    | "Ineligible_CriteriaExpression"
    | "Ineligible_Participation"
  )[];
}

export interface Data<Attributes> {
  type: string;
  id: string;
  attributes: Attributes;
  relationships: Relationships;
  links: {
    self: string;
  };
}

export interface ApiResponse<Data> {
  data: Data;
}

export interface Study extends Data<StudyAttrs> {
  type: "studies";
  relationships: {
    responses: Relationship;
  };
}

export interface Child extends Data<ChildAttrs> {
  type: "children";
  relationships: {
    user: Relationship;
  };
}

export interface PastSession extends Data<PastSessionAttrs> {
  type: "past_sessions";
  relationships: {
    child: Relationship;
    user: Relationship;
    study: Relationship;
    demographic_snapshot: Relationship;
  };
}

export interface Response extends Data<PastSessionAttrs> {
  type: "responses";
  relationships: {
    child: Relationship;
    user: Relationship;
    study: Relationship;
    demographic_snapshot: Relationship;
  };
}

export interface ResponseUpdate {
  type: "responses";
  id: string;
  attributes: ResponseAttrsUpdate;
}

export interface ResponseAttrsUpdate {
  exp_data?: DataCollection[];
  completed?: boolean;
  survey_consent?: boolean;
  completed_consent_frame?: boolean;
}

export type Env = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};
