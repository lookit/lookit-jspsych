import { LookitWindow } from "@lookit/data/dist/types";
import * as Sentry from "@sentry/browser";

jest.mock("@sentry/browser", () => ({
  init: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
  browserTracingIntegration: jest.fn(() => ({ name: "BrowserTracing" })),
  replayIntegration: jest.fn(() => ({ name: "Replay" })),
}));

declare let window: LookitWindow;

const OLD_ENV = process.env;

/**
 * Import a fresh copy of the sentry module so that its module-level
 * "initialized" state is reset between tests.
 *
 * @returns The freshly imported sentry module.
 */
const importSentry = async (): Promise<typeof import("./sentry")> => {
  let mod: typeof import("./sentry");
  await jest.isolateModulesAsync(async () => {
    mod = await import("./sentry");
  });
  return mod!;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Copy so tests can mutate env freely.
  process.env = { ...OLD_ENV };
  // Reset window.chs so preview detection doesn't leak between tests.
  delete (window as Partial<LookitWindow>).chs;
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe("initSentry", () => {
  test("does not initialize when no DSN is configured", async () => {
    delete process.env.SENTRY_DSN;
    const { initSentry, isSentryInitialized } = await importSentry();

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isSentryInitialized()).toBe(false);
  });

  test("initializes with the configured DSN, environment, and release", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.SENTRY_ENVIRONMENT = "staging";
    process.env.SENTRY_RELEASE = "1.2.3";
    const { initSentry, isSentryInitialized } = await importSentry();

    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
        environment: "staging",
        release: "1.2.3",
      }),
    );
    expect(Sentry.browserTracingIntegration).toHaveBeenCalledTimes(1);
    expect(Sentry.replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    );
    expect(isSentryInitialized()).toBe(true);
  });

  test("falls back to production environment and undefined release", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
    const { initSentry } = await importSentry();

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "production",
        release: undefined,
      }),
    );
  });

  test("only initializes once when called repeatedly", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    const { initSentry } = await importSentry();

    initSentry();
    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  test("does not initialize for preview sessions", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    window.chs = {
      response: { attributes: { is_preview: true } },
    } as unknown as LookitWindow["chs"];
    const { initSentry, isSentryInitialized } = await importSentry();

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isSentryInitialized()).toBe(false);
  });

  test("initializes for non-preview sessions", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    window.chs = {
      response: { attributes: { is_preview: false } },
    } as unknown as LookitWindow["chs"];
    const { initSentry, isSentryInitialized } = await importSentry();

    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(isSentryInitialized()).toBe(true);
  });

  test("does not throw or mark initialized when Sentry.init throws", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    (Sentry.init as jest.Mock).mockImplementationOnce(() => {
      throw new Error("sentry init blew up");
    });
    const { initSentry, isSentryInitialized } = await importSentry();

    // A failed init must not propagate (it would stop experiment startup) and
    // must leave Sentry marked uninitialized so later calls no-op.
    expect(() => initSentry()).not.toThrow();
    expect(isSentryInitialized()).toBe(false);
  });
});

describe("setSentryContext", () => {
  test("does nothing when Sentry is not initialized", async () => {
    delete process.env.SENTRY_DSN;
    const { setSentryContext } = await importSentry();

    setSentryContext("response-uuid");

    expect(Sentry.setTag).not.toHaveBeenCalled();
  });

  test("sets study/response tags from window.chs when initialized", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    window.chs = {
      study: {
        id: "study-uuid",
        attributes: { name: "My Study" },
      },
      response: {
        attributes: { is_preview: false, hash_child_id: "hashed-child" },
      },
    } as unknown as LookitWindow["chs"];
    const { initSentry, setSentryContext } = await importSentry();
    initSentry();

    setSentryContext("response-uuid");

    expect(Sentry.setTag).toHaveBeenCalledWith(
      "response_uuid",
      "response-uuid",
    );
    expect(Sentry.setTag).toHaveBeenCalledWith("study_uuid", "study-uuid");
    expect(Sentry.setTag).toHaveBeenCalledWith("study_name", "My Study");
    expect(Sentry.setTag).toHaveBeenCalledWith("is_preview", false);
    expect(Sentry.setTag).toHaveBeenCalledWith("hash_child_id", "hashed-child");
  });

  test("sets only the response_uuid tag when window.chs has no study/response", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    window.chs = {} as unknown as LookitWindow["chs"];
    const { initSentry, setSentryContext } = await importSentry();
    initSentry();

    setSentryContext("response-uuid");

    expect(Sentry.setTag).toHaveBeenCalledTimes(1);
    expect(Sentry.setTag).toHaveBeenCalledWith(
      "response_uuid",
      "response-uuid",
    );
  });

  test("does not throw when Sentry.setTag throws", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    const { initSentry, setSentryContext } = await importSentry();
    initSentry();
    (Sentry.setTag as jest.Mock).mockImplementationOnce(() => {
      throw new Error("setTag blew up");
    });

    // Attaching context must never propagate and stop the experiment.
    expect(() => setSentryContext("response-uuid")).not.toThrow();
  });
});

describe("captureCHSError", () => {
  test("captures with a context tag when context is provided", async () => {
    const { captureCHSError } = await importSentry();
    const error = new Error("boom");

    captureCHSError(error, "on_finish_save_response_data");

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { chs_context: "on_finish_save_response_data" },
    });
  });

  test("captures without extra data when no context is provided", async () => {
    const { captureCHSError } = await importSentry();
    const error = new Error("boom");

    captureCHSError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined);
  });

  test("does not throw when Sentry.captureException itself throws", async () => {
    (Sentry.captureException as jest.Mock).mockImplementation(() => {
      throw new Error("sentry transport is broken");
    });
    const { captureCHSError } = await importSentry();

    // The whole point: reporting an error must never throw and take down the
    // caller's own error handling.
    expect(() =>
      captureCHSError(new Error("boom"), "some_context"),
    ).not.toThrow();
  });
});
