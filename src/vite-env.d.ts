/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FF_TASKS?: string;
  readonly VITE_FF_TASK?: string;
  readonly VITE_FF_SUMMARY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
