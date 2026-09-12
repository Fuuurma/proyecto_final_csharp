/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Fixture pin for the collection search (see .env.example). */
  readonly MET_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
