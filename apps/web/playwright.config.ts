import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5180",
  },
  webServer: [
    {
      command: "pnpm dev",
      cwd: "../api",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm dev",
      cwd: ".",
      url: "http://localhost:5180",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
