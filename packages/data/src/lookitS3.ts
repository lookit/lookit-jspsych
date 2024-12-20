import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import {
  AWSConfigError,
  AWSMissingAttrError,
  ExpiredCredentials,
  MissingCredentials,
  UploadPartError,
} from "./errors";
import { awsVars } from "./types";

/** Provides functionality to upload videos incrementally to an AWS S3 Bucket. */
class LookitS3 {
  private blobParts: Blob[] = [];
  private promises: Promise<{ PartNumber: number; ETag: string }>[] = [];
  private partNumber: number = 1;
  private partsUploaded: number = 0;
  private s3: S3Client;
  private uploadId: string = "";
  private key: string;
  private bucket: string;
  private awsVars: awsVars;
  private complete: boolean = false;

  public static readonly minUploadSize: number = 5 * 1024 * 1024;

  /**
   * Provide file name to initiate a new upload to a S3 bucket. The AWS secrets
   * and bucket name come from environment variables.
   *
   * @param key - Used to identify upload, mostly likely video file name.
   */
  public constructor(key: string) {
    this.key = key;
    try {
      this.awsVars = JSON.parse(
        document.getElementById("aws-vars")!.textContent!,
      );
    } catch {
      throw new MissingCredentials();
    }
    try {
      this.bucket = this.awsVars.JSPSYCH_S3_BUCKET;
      this.s3 = new S3Client({
        region: this.awsVars.JSPSYCH_S3_REGION,
        credentials: {
          accessKeyId: this.awsVars.JSPSYCH_S3_ACCESS_KEY_ID,
          secretAccessKey: this.awsVars.JSPSYCH_S3_SECRET_ACCESS_KEY,
          sessionToken: this.awsVars.JSPSYCH_S3_SESSION_TOKEN,
        },
      });
    } catch (e) {
      this.logRecordingEvent(`Error setting up the S3 client.\nError: ${e}`);
      if (this.awsExpiredToken(e)) {
        throw new ExpiredCredentials();
      } else {
        throw new AWSConfigError(e);
      }
    }
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

    try {
      const response = await this.s3.send(command);
      if (!response.UploadId) {
        throw new AWSMissingAttrError("UploadId");
      }
      this.uploadId = response.UploadId;
      this.logRecordingEvent(`Connection established.`);
    } catch (error) {
      this.logRecordingEvent(
        `Error creating upload ${this.key}.\nError: ${error}`,
      );
      if (this.awsExpiredToken(error)) {
        throw new ExpiredCredentials();
      } else {
        throw error;
      }
    }
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
        if (this.awsExpiredToken(_err)) {
          throw new ExpiredCredentials();
        } else {
          err = _err as Error;
          retry += 1;
        }
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

    try {
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
      this.complete = true;
      this.logRecordingEvent(`Upload complete: ${response.Location}`);
    } catch (error) {
      this.logRecordingEvent(
        `Error completing upload ${this.key}.\nError: ${error}`,
      );
      if (this.awsExpiredToken(error) || error instanceof ExpiredCredentials) {
        throw new ExpiredCredentials();
      } else {
        throw error;
      }
    }
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

  /**
   * Whether or not an upload is in progress (created and not yet completed).
   *
   * @returns Boolean indicating whether or not an upload has been created but
   *   not yet completed.
   */
  public get uploadInProgress(): boolean {
    return this.uploadId !== "" && !this.complete;
  }

  /**
   * Check whether an AWS S3 error is due to expired credentials/token.
   *
   * @param error - Error returned from S3.
   * @returns Boolean indicating whether or not this is an Expired Token error.
   */
  private awsExpiredToken(error: unknown) {
    if (
      error instanceof Object &&
      "name" in error &&
      error.name === "ExpiredTokenException"
    ) {
      return true;
    } else {
      return false;
    }
  }
}

export default LookitS3;
