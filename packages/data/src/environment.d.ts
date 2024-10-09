declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JSPSYCH_S3_REGION: string;
      JSPSYCH_S3_ACCESS_KEY_ID: string;
      JSPSYCH_S3_SECRET_ACCESS_KEY: string;
      JSPSYCH_S3_BUCKET: string;
    }
  }
}

export {};
