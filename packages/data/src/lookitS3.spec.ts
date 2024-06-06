import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import LookitS3 from "./lookitS3";

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
