declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LOCAL_DOWNLOAD?: string;
      DEBUG?: string;
    }
  }
}

export {};
