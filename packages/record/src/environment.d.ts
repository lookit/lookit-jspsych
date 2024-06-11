declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LOCAL_DOWNLOAD?: string;
    }
  }
}

export {};
