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
    // A click or request that never lands fails and says where, rather than hanging the run.
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  // The three surfaces: player phone, controls tablet, display TV. The teams and showdowns
  // tests switch the shared event into the team phase, so they run on their own, after the rest.
  projects: [
    {
      name: "phone",
      testIgnore: /(teams|showdowns|showdowns-play|raffle)\.spec/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet",
      testIgnore: /(teams|showdowns|showdowns-play|showdown-gallery|raffle)\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "tv",
      testIgnore: /(teams|showdowns|showdowns-play|raffle)\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
    // Check-in and the raffle (spec 32): alone, as it changes what the shared TV shows.
    {
      name: "raffle",
      testMatch: /raffle\.spec/,
      dependencies: ["phone", "tablet", "tv"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "teams",
      testMatch: /teams\.spec/,
      dependencies: ["raffle"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    {
      name: "showdowns",
      testMatch: /showdowns\.spec/,
      dependencies: ["teams"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } },
    },
    // Every showdown played through: last, as it also uses the team phase.
    {
      name: "showdowns-play",
      testMatch: /showdowns-play\.spec/,
      dependencies: ["showdowns"],
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
