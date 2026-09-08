import { LookitWindow } from "@lookit/data/dist/types";
import * as Sentry from "@sentry/browser";

declare let window: LookitWindow;

/**
 * Performance tracing sample rate (0-1). Kept low because a trace is created
 * for every experiment session and we only need a representative sample.
 */
const TRACES_SAMPLE_RATE = 0.1;

/**
 * Session replay sample rate for sessions _without_ an error. 0 = no replay
 * (not needed for ordinary/successful sessions).
 */
const REPLAYS_SESSION_SAMPLE_RATE = 0;

/* Session replay sample rate for sessions where an error occurs. */
const REPLAYS_ON_ERROR_SAMPLE_RATE = 1;

/**
 * Whether Sentry.init has already run in this page. Guards against
 * double-initialization if lookitInitJsPsych is called more than once.
 */
let sentryInitialized = false;

/**
 * Getter function for Sentry initialization. Exposed for other modules (e.g.
 * utils) to decide whether an explicit capture will do anything.
 *
 * @returns True if Sentry.init has run successfully.
 */
export const isSentryInitialized = (): boolean => sentryInitialized;

/**
 * Whether the current session is a study preview. Runtime errors ignored
 * because they are often the researcher's own and we don't want to report
 * them.
 *
 * @returns True if this is a preview session.
 */
const isPreviewSession = (): boolean =>
  Boolean(window.chs?.response?.attributes?.is_preview);

/**
 * Initialize Sentry error tracking, performance tracing, and session replay for
 * CHS jsPsych experiments.
 *
 * The DSN, environment, and release are injected at build time from the repo's
 * .env file (see rollup.config.mjs, which adds the dotenv plugin) or from
 * Github secrets (for releases). If no DSN is configured (e.g. local/dev
 * builds), this is a no-op so that everything can build/run without Sentry.
 *
 * Preview sessions are skipped entirely (no errors, traces, or replays).
 *
 * Session replay is configured to be privacy-preserving: all text and inputs
 * are masked, and all media (including any video/canvas elements) is blocked.
 * Non-error sessions are not recorded at all.
 *
 * Safe to call multiple times; only the first call with a DSN initializes.
 */
export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;

  if (sentryInitialized || !dsn || isPreviewSession()) {
    return;
  }

  // A failure to start error tracking should not stop the experiment from
  // running - worst case is simply no Sentry for this session. sentryInitialized
  // is only set inside the try, so it stays false if init throws and later
  // setSentryContext calls correctly no-op.
  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || "production",
      release: process.env.SENTRY_RELEASE || undefined,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: TRACES_SAMPLE_RATE,
      replaysSessionSampleRate: REPLAYS_SESSION_SAMPLE_RATE,
      replaysOnErrorSampleRate: REPLAYS_ON_ERROR_SAMPLE_RATE,
    });

    sentryInitialized = true;
  } catch {
    // Swallow: better to give up sentry reporting than throw a new error.
  }
};

/**
 * Attach CHS context to Sentry as tags so issues can be grouped and filtered by
 * study/response. Only non-identifying values are sent: study UUID, study name,
 * response UUID, the _hashed_ child id, and the preview flag.
 *
 * Reads from window.chs defensively, since some values may not be populated yet
 * (or at all, e.g. in tests). Does nothing if Sentry is not initialized.
 *
 * @param responseUuid - The CHS response UUID for this experiment session.
 */
export const setSentryContext = (responseUuid: string): void => {
  if (!sentryInitialized) {
    return;
  }

  // Attaching context is best-effort telemetry; like init, it must never throw
  // and stop the experiment. Worst case is an issue missing some tags.
  try {
    Sentry.setTag("response_uuid", responseUuid);

    const chs = window.chs;
    if (chs?.study) {
      Sentry.setTag("study_uuid", chs.study.id);
      Sentry.setTag("study_name", chs.study.attributes?.name);
    }
    if (chs?.response) {
      Sentry.setTag("is_preview", chs.response.attributes?.is_preview);
      Sentry.setTag("hash_child_id", chs.response.attributes?.hash_child_id);
    }
  } catch {
    // Swallow: we want missing tags rather than a new thrown error.
  }
};

/**
 * Report an error to Sentry with an optional short label describing where it
 * happened (used as the "chs.context" tag). A thin wrapper over
 * Sentry.captureException so call sites read clearly and so this is easy to
 * assert on in tests. When Sentry is not initialized this is effectively a
 * no-op.
 *
 * The whole call is wrapped in try/catch so that error _reporting_ can never
 * throw and take down the caller's own error handling (e.g. the on_finish save
 * and exit-redirect flow). Sentry.captureException is contractually
 * non-throwing, so this is just extra defense against an unexpected
 * SDK/transport failure.
 *
 * @param error - The error/exception to report.
 * @param context - Optional short label for where the error occurred, e.g.
 *   "on_finish_save".
 */
export const captureCHSError = (error: unknown, context?: string): void => {
  try {
    Sentry.captureException(
      error,
      context ? { tags: { chs_context: context } } : undefined,
    );
  } catch {
    // Swallow: Sentry reporting should not break the experiment's own error handling.
  }
};
