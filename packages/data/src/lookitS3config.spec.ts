import * as awsSdk from "@aws-sdk/client-s3";
import {
  AWSConfigError,
  ExpiredCredentials,
  MissingCredentials,
} from "./errors";
import LookitS3 from "./lookitS3";

/** Mock for the AWS expired token error */
class MockExpiredTokenError extends Error {
  /**
   * Constructor
   *
   * @param message - Error message.
   */
  public constructor(message: string) {
    super(message);
    this.name = "ExpiredTokenException";
  }
}

// This is in a separate file because imports can only be mocked once per file, at the top level (not inside test functions), and the config failure test requires a different mock than the rest of the lookitS3 tests.
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => {
    throw new Error("Error");
  }),
}));

// Mock the retrieval of AWS variables passed from lookit-api into the jsPsych study template. The variables are stored in a script element that is retrieved with document.getElementById  in the LookitS3 constructor. This mock is currently needed for all tests in this file, but could potentially cause problems if document.getElementById is used for other purposes during these tests.
beforeEach(() => {
  Object.assign(document, {
    getElementById: jest.fn().mockImplementation(() => {
      return {
        textContent:
          '{"JSPSYCH_S3_REGION":"region","JSPSYCH_S3_ACCESS_KEY_ID":"keyId","JSPSYCH_S3_SECRET_ACCESS_KEY":"key","JSPSYCH_S3_BUCKET":"bucket","JSPSYCH_S3_SESSION_TOKEN":"token","JSPSYCH_S3_EXPIRATION":"datestring"}',
      };
    }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test("Lookit S3 constructor throws error when S3 Client initialization fails", () => {
  expect(() => {
    new LookitS3("key value");
  }).toThrow(AWSConfigError);
  expect(() => {
    new LookitS3("key value");
  }).toThrow("AWS configuration error: Error");
});

test("Lookit S3 constructor throws missing credentials error when AWS variables are not found", () => {
  Object.assign(document, {
    getElementById: jest.fn().mockImplementation(() => {
      return undefined;
    }),
  });
  expect(() => {
    new LookitS3("key value");
  }).toThrow(MissingCredentials);
  expect(() => {
    new LookitS3("key value");
  }).toThrow("AWS credentials for video uploading not found.");
});

test("Lookit S3 constructor throws expired credentials error when AWS token is expired", () => {
  (awsSdk.S3Client as jest.Mock).mockImplementation(() => {
    throw new MockExpiredTokenError("");
  });
  window.alert = jest.fn();
  expect(() => {
    new LookitS3("key value");
  }).toThrow(ExpiredCredentials);
  expect(() => {
    new LookitS3("key value");
  }).toThrow(
    "The video upload credentials have expired. Please re-start the experiment on the CHS website.",
  );
  expect(window.alert).toHaveBeenCalledTimes(2);
  expect(window.alert).toHaveBeenCalledWith(
    "Your credentials have expired. Please re-start the experiment on the CHS website.",
  );
});
