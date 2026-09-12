import { existsSync, renameSync, unlinkSync } from "node:fs";

/** Restores the pre-e2e `.dev.vars` (or removes ours if none existed). */
export default function teardown() {
  if (existsSync(".dev.vars.e2e-bak")) {
    renameSync(".dev.vars.e2e-bak", ".dev.vars");
  } else if (existsSync(".dev.vars")) {
    unlinkSync(".dev.vars");
  }
}
