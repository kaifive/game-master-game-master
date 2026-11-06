import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // The three surfaces: player phone, controls tablet, display TV. The teams test
  // switches the shared event into the team phase, so it runs on its own, after the rest.
  projects: [
    { name: "phone", testIgnore: /teams\.spec/, use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      testIgnore: /teams\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "tv",
      testIgnore: /teams\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: "teams",
      testMatch: /teams\.spec/,
      dependencies: ["phone", "tablet", "tv"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // No Firebase in CI or locally: every event shows as upcoming.
    env: { GM_ALLOW_NO_FIREBASE: "1", ADMIN_PASSPHRASE: "e2e-host-pass" },
    timeout: 180_000,
  },
});
