export type ApiPromise = Promise<Data<Attributes> | Data<Attributes>[]>;

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
  image?: string | null;
  structure?: Record<string, never>;
  generator?: string;
  use_generator?: boolean;
  display_full_screen?: boolean;
  exit_url?: string;
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

export interface JsPsychExpData {
  trial_index: number;
  trial_type: string;
}

export interface ResponseAttrs extends Attributes {
  conditions?: Record<string, never>;
  global_event_timings?: Record<string, never>;
  exp_data?: JsPsychExpData[];
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

export interface Response extends Data<ResponseAttrs> {
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
  exp_data?: JsPsychExpData[];
  completed?: boolean;
  survey_consent?: boolean;
  completed_consent_frame?: boolean;
  sequence?: string[];
}

export interface LookitWindow extends Window {
  chs: {
    study: Study;
    child: Child;
    pastSessions: Response[];
    response: Response;
    sessionRecorder: unknown;
  };
}

export interface awsVars {
  JSPSYCH_S3_REGION: string;
  JSPSYCH_S3_ACCESS_KEY_ID: string;
  JSPSYCH_S3_SECRET_ACCESS_KEY: string;
  JSPSYCH_S3_BUCKET: string;
  JSPSYCH_S3_SESSION_TOKEN: string;
  JSPSYCH_S3_EXPIRATION: string;
}
