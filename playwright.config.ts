import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The webServer starts BEFORE globalSetup, but reads `.dev.vars` at
// startup — the fixture flag must be written at config-load time
// (restored by globalTeardown). Late writes were the root cause of a
// whole cycle of flaky reds (09-11 02:30-05:00).
const devVarsPath = ".dev.vars";
const devVarsBackup = ".dev.vars.e2e-bak";
// Only write on CONTENT CHANGE: every Playwright worker re-evaluates
// this config, and the cloudflare plugin watches .dev.vars — rewriting
// identical content triggered a vite restart storm that lost the port
// (09-11 05:15). One process performs the one real write.
const desired = "MET_API_MODE=fixture\n";
const current = existsSync(devVarsPath)
  ? readFileSync(devVarsPath, "utf8")
  : null;
if (current !== desired) {
  if (current !== null) {
    writeFileSync(devVarsBackup, current);
  }
  writeFileSync(devVarsPath, desired);
}

export default defineConfig({
  globalSetup: "./e2e-global-setup.ts",
  globalTeardown: "./e2e-global-teardown.ts",
  testDir: "./tests",
  fullyParallel: true,
  // The first 1-2 tests race the workerd cold-start (on-demand first
  // route compilation) — retries absorb the warmup, not real flakes.
  retries: 2,
  // One dev server serves every worker; full parallelism produced
  // moving failures under load (09-11 05:00). Two workers = stable.
  workers: 2,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3180",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run dev",
    env: { MET_API_MODE: "fixture" },
    url: "http://127.0.0.1:3180",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      // A real mobile descriptor: touch emulation, mobile UA, and device
      // scale factor — a narrow Desktop Chrome viewport was none of those
      // (devin 09-09 16:17 #4).
      use: { ...devices["Pixel 7"] },
    },
  ],
});
