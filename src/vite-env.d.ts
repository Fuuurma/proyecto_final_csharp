/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Server-only Met API mode flag.
   *
   * The non-`VITE_` prefix is intentional: Vite only exposes `VITE_*` env
   * vars to the client bundle, so a plain `MET_API_MODE` name keeps this
   * flag out of client code. It is read exclusively inside server
   * functions (`src/lib/met/server-functions.ts`), where Vite's SSR
   * runtime still resolves the full env object.
   *
   * Accepted values: `"fixture"` (use the curated review set instead of
   * live Met API), unset/other (live Met API).
   */
  readonly MET_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
