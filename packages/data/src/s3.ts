import { S3 } from "@aws-sdk/client-s3";

type Env = { accessKeyId: string; secretAccessKey: string; bucket: string };

export default class {
  env: Env;
  key: string;
  blobParts: Blob[];
  promises: Promise<{ PartNumber: number; ETag?: string }>[];
  partNumber: number;
  partsUploaded: number;
  s3: S3;
  uploadId?: string;

  constructor(key: string, s3vars: Env) {
    this.env = s3vars;
    this.key = key;
    this.blobParts = [];
    this.promises = [];
    this.partNumber = 1;
    this.partsUploaded = 0;

    this.s3 = new S3({
      credentials: {
        accessKeyId: this.env.accessKeyId,
        secretAccessKey: this.env.secretAccessKey,
      },
    });
  }

  get blobPartsSize() {
    return this.blobParts.reduce((p, c) => {
      return p + c.size;
    }, 0);
  }

  get percentUploadComplete() {
    return Math.floor((this.partsUploaded / this.partNumber) * 100);
  }

  async createUpload() {
    this.logRecordingEvent(`Creating video upload connection.`);
    const createResponse = await this.s3.createMultipartUpload({
      Bucket: this.env.bucket,
      Key: this.key,
      ContentType: "video/webm",
    });
    this.uploadId = createResponse.UploadId;
    this.logRecordingEvent(`Connection established.`);
  }

  async uploadPart(blob: Blob, partNumber: number) {
    let retry = 0;
    let err;
    while (retry < 3) {
      try {
        const uploadPartResponse = await this.s3.uploadPart({
          Body: blob,
          Bucket: this.env.bucket,
          Key: this.key,
          PartNumber: partNumber,
          UploadId: this.uploadId,
        });
        this.logRecordingEvent(`Uploaded file part ${partNumber}.`);

        this.partsUploaded++;

        return {
          PartNumber: partNumber,
          ETag: uploadPartResponse.ETag,
        };
      } catch (_err) {
        this.logRecordingEvent(
          `Error uploading part ${partNumber}.\nError: ${_err}`,
        );
        err = _err;
        retry += 1;
      }
    }
    throw Error(`Upload part failed after 3 attempts.\nError: ${err}`);
  }

  async completeUpload() {
    this.addUploadPartPromise();
    const parts = await Promise.all(this.promises);

    return this.s3
      .completeMultipartUpload({
        Bucket: this.env.bucket,
        Key: this.key,
        MultipartUpload: {
          Parts: parts,
        },
        UploadId: this.uploadId,
      })
      .then((resp) => {
        this.logRecordingEvent(`Upload complete: ${resp.Location}`);
      });
  }

  addUploadPartPromise() {
    this.promises.push(
      this.uploadPart(new Blob(this.blobParts), this.partNumber++),
    );
    this.blobParts = [];
  }

  onDataAvailable(blob: Blob) {
    this.blobParts.push(blob);

    if (this.blobPartsSize > 5 * (1024 * 1024)) {
      this.addUploadPartPromise();
    }
  }

  logRecordingEvent(msg: string) {
    // right now this just prints to the console, but we could also send this info to permanent storage (similar to pipe logs)
    const timestamp = new Date().toISOString();
    console.log(`Recording log: ${timestamp}\nFile: ${this.key}\n${msg}\n`);
  }
}
