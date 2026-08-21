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

export type uploadRecord = {
  promise: Promise<void>;
  file: string;
  /** Upload outcome, updated as the upload promise settles. */
  status: RecordingUploadStatus;
  /** Error message captured if the upload failed. */
  error_message?: string;
};

/**
 * How a recording's stream-time reference point (media t=0) was determined. See
 * the Recorder in @lookit/record for details.
 *
 * - "event": the MediaRecorder "start" event fired within the timeout, so the
 *   reference is accurate.
 * - "fallback": the "start" event did not fire within the timeout, so a call-site
 *   timestamp was used. The reference (and any derived stream times) is
 *   inaccurate by an unknown amount.
 * - "fallback_corrected": the fallback timestamp was used initially to avoid
 *   blocking, but the "start" event later fired and corrected the reference.
 */
export type StartTimeSource = "event" | "fallback" | "fallback_corrected";

/** Per-file recording upload outcome. */
export type RecordingUploadStatus = "pending" | "success" | "failure";

/**
 * Recording stream-time timestamps (milliseconds since the recording started)
 * for trial events. Extensible: additional event timestamps can be added as new
 * keys without introducing new top-level trial data keys. When present (i.e.
 * chs_recording.stream_time is not null), the trial-start timestamp is always
 * populated.
 */
export interface RecordingStreamTime {
  /**
   * Stream time at the start of the trial (ms since the recording started).
   * Negative when the trial started before the recording began — e.g. a
   * single-trial recording, where the recording starts during the trial, so the
   * value is the offset between trial start and recording start.
   */
  trial_start_ms: number;
}

/**
 * CHS recording information attached to a trial's jsPsych data under the
 * `chs_recording` key. `filename` and `is_session_recording` are always present
 * when this block exists, since any trial associated with a recording has both.
 * The remaining fields vary by trial: the full metadata block (method,
 * is_consent, start_time_source) is added on the trial that starts a recording;
 * and upload_status/upload_error are added at experiment on_finish once the
 * upload has settled. stream_time is always present but may be null when no
 * stream time was captured for the trial (e.g. the recording's "start" event
 * had not yet fired).
 */
export interface ChsRecordingData {
  /** Video filename for the recording this trial belongs to. */
  filename: string;
  /** Whether this is a session (cross-trial) recording. */
  is_session_recording: boolean;
  /**
   * Stream-time timestamps for events within this trial, or null if no stream
   * time was captured for the trial.
   */
  stream_time: RecordingStreamTime | null;
  /** Whether the recording is camera (video) or microphone (audio only). */
  method?: "camera" | "microphone";
  /** Whether this is consent footage. */
  is_consent?: boolean;
  /** How the stream-time reference point was determined. */
  start_time_source?: StartTimeSource;
  /**
   * Upload outcome for the recording, added at experiment on_finish once the
   * upload has settled (so in saved data this is "success" or "failure").
   */
  upload_status?: RecordingUploadStatus;
  /** Upload error message, if the upload failed. */
  upload_error?: string;
}

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
  /**
   * CHS recording information, present on trials associated with a video/audio
   * recording.
   */
  chs_recording?: ChsRecordingData;
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
    pendingUploads: uploadRecord[];
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
