import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke suite for pages that don't require a real wallet
 * extension or a wallet-adapter mock — see e2e/README.md for why
 * transactional flows (bidding, voting, creating a deal) are scoped out.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
