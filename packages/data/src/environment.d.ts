declare global {
  namespace NodeJS {
    interface ProcessEnv {
      S3_REGION: string;
      S3_ACCESS_KEY_ID: string;
      S3_SECRET_ACCESS_KEY: string;
      S3_BUCKET: string;
    }
  }
}

export {};
