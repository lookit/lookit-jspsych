import { AWSConfigError } from "./errors";
import LookitS3 from "./lookitS3";

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

test.only("Lookit S3 constructor throws error when S3 Client initialization fails", () => {
  expect(() => {
    new LookitS3("key value");
  }).toThrow(AWSConfigError);
  expect(() => {
    new LookitS3("key value");
  }).toThrow("AWS configuration error: Error");
});
