import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  retries: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Link audits and smoke checks can target a production build via
  // PLAYWRIGHT_BASE_URL + PLAYWRIGHT_NO_SERVER=1 (no dev compiles).
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: "npx next dev --webpack --port 3000",
        url: "http://127.0.0.1:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
