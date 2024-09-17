import LookitS3 from "./lookitS3";

// This is in a separate file because imports can only be mocked once per file, at the top level (not inside test functions), and the config failure test requires a different mock than the rest of the lookitS3 tests.
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => {
    throw new Error("Error");
  }),
}));

test.only("Lookit S3 constructor throws error when S3 Client initialization fails", () => {
  expect(() => {
    new LookitS3("key value");
  }).toThrow();
});
