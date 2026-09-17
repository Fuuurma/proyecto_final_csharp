import { existsSync, renameSync } from "node:fs";

/**
 * Restores the pre-e2e `.dev.vars` when the config block backed one up.
 *
 * No-backup + file-exists means the dev's own `.dev.vars` already
 * byte-matched the fixture flag at config-load (config correctly skipped
 * the backup) — deleting it destroyed their file with no way back
 * (needs-work 09-12 follow-up). A stray fixture file from an aborted
 * no-backup run is visible litter, not data loss; warn and leave it.
 */
export default function teardown() {
  if (existsSync(".dev.vars.e2e-bak")) {
    renameSync(".dev.vars.e2e-bak", ".dev.vars");
  } else if (existsSync(".dev.vars")) {
    console.warn(
      "[e2e] no .dev.vars backup existed; left the existing file in place",
    );
  }
}
