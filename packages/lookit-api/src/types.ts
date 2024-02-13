type Relationship = {
  links: {
    related: string;
  };
};

type Attributes = {
  readonly pk?: number;
  readonly url?: string;
};

interface Relationships {}

interface ChildAttrs extends Attributes {
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

interface PastSessionAttrs extends Attributes {
  conditions?: Record<string, never>;
  global_event_timings?: Record<string, never>;
  exp_data?: Record<string, never>;
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

interface Data<Attributes> {
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
