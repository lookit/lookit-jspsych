import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { AWSMissingAttrError, UploadPartError } from "./errors";

/** Provides functionality to upload videos incrementally to an AWS S3 Bucket. */
class LookitS3 {
  private blobParts: Blob[] = [];
  private promises: Promise<{ PartNumber: number; ETag: string }>[] = [];
  private partNumber: number = 1;
  private partsUploaded: number = 0;
  private s3: S3Client;
  private uploadId: string = "";
  private key: string;
  private bucket: string = process.env.S3_BUCKET;

  public static readonly minUploadSize: number = 5 * 1024 * 1024;

  /**
   * Provide file name to initiate a new upload to a S3 bucket. The AWS secrets
   * and bucket name come from environment variables.
   *
   * @param key - Used to identify upload, mostly likely video file name.
   */
  public constructor(key: string) {
    this.key = key;
    this.s3 = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Calculate the current blob size from the list of blob parts.
   *
   * @returns Size of collected blobs.
   */
  private get blobPartsSize() {
    return this.blobParts.reduce((p, c) => {
      return p + c.size;
    }, 0);
  }

  /**
   * Current upload percent completed.
   *
   * @returns Percent uploaded.
   */
  public get percentUploadComplete() {
    return Math.floor((this.partsUploaded / this.promises.length) * 100);
  }

  /**
   * Create upload part from list of blob parts and add upload promise to list
   * of promises.
   */
  private addUploadPartPromise() {
    this.promises.push(
      this.uploadPart(new Blob(this.blobParts), this.partNumber++),
    );
    this.blobParts = [];
  }

  /** Create a AWS S3 upload. */
  public async createUpload() {
    this.logRecordingEvent(`Creating video upload connection.`);
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: this.key,
      ContentType: "video/webm", // TO DO: check browser support for type/codec and set the actual value here
    });

    const response = await this.s3.send(command);
    if (!response.UploadId) {
      throw new AWSMissingAttrError("UploadId");
    }

    this.uploadId = response.UploadId;
    this.logRecordingEvent(`Connection established.`);
  }

  /**
   * Upload a blob as a part of a whole video. This will retry the partial
   * upload a few times before returning an error.
   *
   * @param blob - Blob representing a part of a whole video.
   * @param partNumber - Index of upload part.
   * @returns Object containing part number and etag needed by S3.
   */
  private async uploadPart(blob: Blob, partNumber: number) {
    let retry = 0;
    let err: Error | undefined = undefined;
    const input = {
      Body: blob,
      Bucket: this.bucket,
      Key: this.key,
      PartNumber: partNumber,
      UploadId: this.uploadId,
    };
    const command = new UploadPartCommand(input);

    while (retry < 3) {
      try {
        const response = await this.s3.send(command);
        if (!response.ETag) {
          throw new AWSMissingAttrError("ETag");
        }

        this.logRecordingEvent(`Uploaded file part ${partNumber}.`);
        this.partsUploaded++;

        return {
          PartNumber: partNumber,
          ETag: response.ETag,
        };
      } catch (_err) {
        this.logRecordingEvent(
          `Error uploading part ${partNumber}.\nError: ${_err}`,
        );
        err = _err as Error;
        retry += 1;
      }
    }

    throw new UploadPartError(err);
  }

  /**
   * Finalize AWS S3 upload. This is called when all video parts have been
   * uploaded.
   */
  public async completeUpload() {
    this.addUploadPartPromise();

    const input = {
      Bucket: this.bucket,
      Key: this.key,
      MultipartUpload: {
        Parts: await Promise.all(this.promises),
      },
      UploadId: this.uploadId,
    };
    const command = new CompleteMultipartUploadCommand(input);
    const response = await this.s3.send(command);

    this.logRecordingEvent(`Upload complete: ${response.Location}`);
  }

  /**
   * This will take provided blob and add it to the list of blob parts. If the
   * list of blob parts is around 5mb, it will start another partial upload.
   *
   * @param blob - Part of a video file.
   */
  public onDataAvailable(blob: Blob) {
    this.blobParts.push(blob);

    if (this.blobPartsSize > LookitS3.minUploadSize) {
      this.addUploadPartPromise();
    }
  }

  /**
   * Log messages to JS console. Right now this just prints to the console, but
   * we could also send this info to permanent storage (similar to pipe logs).
   *
   * @param msg - Text to logged.
   */
  public logRecordingEvent(msg: string) {
    const timestamp = new Date().toISOString();
    console.log(`Recording log: ${timestamp}\nFile: ${this.key}\n${msg}\n`);
  }
}

export default LookitS3;
