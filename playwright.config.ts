import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
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
    command: "corepack pnpm run dev",
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
