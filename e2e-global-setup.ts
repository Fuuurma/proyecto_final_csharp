import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * The cloudflare vite plugin loads `.dev.vars` into the workerd env —
 * without this file fixture mode cannot engage in e2e (P1, fixed
 * 03:00). Writes the fixture flag, preserving any existing file.
 */
export default function setup() {
  if (existsSync(".dev.vars")) {
    writeFileSync(".dev.vars.e2e-bak", readFileSync(".dev.vars"));
  }
  writeFileSync(".dev.vars", "MET_API_MODE=fixture\n");
}
