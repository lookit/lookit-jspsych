import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { ExpiredCredentials } from "./errors";
import LookitS3 from "./lookitS3";

/** Mock for the AWS expired token error that can be received from s3.send. */
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

let mockSendRtn: { UploadId?: string; ETag?: string };
const largeBlob = new Blob(["x".repeat(LookitS3.minUploadSize + 1)]);

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockReturnValue(mockSendRtn),
  })),
  CreateMultipartUploadCommand: jest.fn().mockImplementation(),
  UploadPartCommand: jest.fn().mockImplementation(),
  CompleteMultipartUploadCommand: jest.fn().mockImplementation(),
}));

// Mock the retrieval of AWS variables passed from lookit-api into the jsPsych study template. The variables are stored in a script element that is retrieved with document.getElementById in the LookitS3 constructor. This mock is currently needed for all tests in this file, but could potentially cause problems if document.getElementById is used for other purposes during these tests.
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

test("Upload file to S3", async () => {
  mockSendRtn = { UploadId: "upload id", ETag: "etag" };
  const s3 = new LookitS3("key value");

  await s3.createUpload();
  expect(s3.percentUploadComplete).toBeNaN;

  s3.onDataAvailable(largeBlob);
  expect(s3.percentUploadComplete).toBe(0);

  await s3.completeUpload();
  expect(s3.percentUploadComplete).toBe(100);

  expect(UploadPartCommand).toHaveBeenCalledTimes(2);
  expect(CreateMultipartUploadCommand).toHaveBeenCalledTimes(1);
  expect(CompleteMultipartUploadCommand).toHaveBeenCalledTimes(1);
});

test("Upload file to S3 multiple parts", async () => {
  mockSendRtn = { UploadId: "upload id", ETag: "etag" };
  const s3 = new LookitS3("key value");

  await s3.createUpload();

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 100; j++) {
      s3.onDataAvailable(largeBlob.slice(0, largeBlob.size / 100));
    }
  }

  await s3.completeUpload();

  /**
   * UploadPartCommand is called once for every 100 blobs added. We do this
   * twice. Add one more call for when we completeUpload.
   */
  expect(UploadPartCommand).toHaveBeenCalledTimes(3);

  expect(CreateMultipartUploadCommand).toHaveBeenCalledTimes(1);
  expect(CompleteMultipartUploadCommand).toHaveBeenCalledTimes(1);
});

test("Upload to S3 missing upload id", () => {
  mockSendRtn = { ETag: "etag" };
  const s3 = new LookitS3("key value");
  expect(async () => {
    await s3.createUpload();
  }).rejects.toThrow(
    "Response from AWS send is missing an attribute: UploadId",
  );

  expect(CreateMultipartUploadCommand).toHaveBeenCalledTimes(1);
});

test("Upload to S3 missing Etag", async () => {
  mockSendRtn = { UploadId: "upload id" };
  const s3 = new LookitS3("key value");
  await s3.createUpload();
  s3.onDataAvailable(largeBlob);
  expect(async () => {
    await s3.completeUpload();
  }).rejects.toThrow(
    "Upload part failed after 3 attempts: AWSMissingAttrError: Response from AWS send is missing an attribute: ETag",
  );

  expect(UploadPartCommand).toHaveBeenCalledTimes(2);
  expect(CreateMultipartUploadCommand).toHaveBeenCalledTimes(1);
  expect(CompleteMultipartUploadCommand).toHaveBeenCalledTimes(0);
});

test("Upload in progress", async () => {
  mockSendRtn = { UploadId: "upload id", ETag: "etag" };
  const s3 = new LookitS3("key value");

  expect(s3.uploadInProgress).toBe(false);
  await s3.createUpload();
  expect(s3.uploadInProgress).toBe(true);
  s3.onDataAvailable(largeBlob);
  await s3.completeUpload();
  expect(s3.uploadInProgress).toBe(false);
});

test("Create upload throws expired credentials error", () => {
  window.alert = jest.fn();
  const s3 = new LookitS3("key value");

  // Implement the token expired error for s3.send
  s3["s3"]["send"] = jest.fn(() => {
    throw new MockExpiredTokenError("");
  });

  expect(async () => await s3.createUpload()).rejects.toThrow(
    ExpiredCredentials,
  );
  expect(async () => await s3.createUpload()).rejects.toThrow(
    "The video upload credentials have expired. Please re-start the experiment on the CHS website.",
  );
  expect(window.alert).toHaveBeenCalledTimes(2);
  expect(window.alert).toHaveBeenCalledWith(
    "Your credentials have expired. Please re-start the experiment on the CHS website.",
  );
});

test("Upload part throws expired credentials error", async () => {
  window.alert = jest.fn();
  mockSendRtn = { UploadId: "upload id", ETag: "etag" };
  const s3 = new LookitS3("key value");

  // Create the upload without errors
  await s3.createUpload();
  s3.onDataAvailable(largeBlob);

  // Implement the token expired error for s3.send
  s3["s3"]["send"] = jest.fn(() => {
    throw new MockExpiredTokenError("");
  });

  // completeUpload calls uploadPart
  expect(async () => {
    await s3.completeUpload();
  }).rejects.toThrow(ExpiredCredentials);
  expect(async () => {
    await s3.completeUpload();
  }).rejects.toThrow(
    "The video upload credentials have expired. Please re-start the experiment on the CHS website.",
  );
  expect(window.alert).toHaveBeenCalledTimes(2);
  expect(window.alert).toHaveBeenCalledWith(
    "Your credentials have expired. Please re-start the experiment on the CHS website.",
  );
});

test("Complete upload throws expired credentials", async () => {
  mockSendRtn = { UploadId: "upload id", ETag: "etag" };
  const s3 = new LookitS3("key value");
  await s3.createUpload();

  // Mock addUploadPartPromise because completeUpload will trigger uploadPart and s3.send for the part, before sending the complete upload command. If we just mock the s3.send error and call completeUpload, the error will always be thrown for uploadPart and the code will never reach the second s3.send command to complete the upload.
  s3["uploadPart"] = jest.fn().mockImplementation(() => {
    return Promise.resolve({ PartNumber: 1, ETag: "etag" });
  });

  // Implement the token expired error for s3.send
  s3["s3"]["send"] = jest.fn(() => {
    throw new MockExpiredTokenError("");
  });

  expect(async () => {
    await s3.completeUpload();
  }).rejects.toThrow(ExpiredCredentials);
  expect(async () => {
    await s3.completeUpload();
  }).rejects.toThrow(
    "The video upload credentials have expired. Please re-start the experiment on the CHS website.",
  );
});
