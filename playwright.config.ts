import { defineConfig, devices } from "@playwright/test";

const viewports = [
  { name: "large-desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "compact-laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 360, height: 800 },
] as const;

const projects = viewports.flatMap((viewport) =>
  (["light", "dark"] as const).map((theme) => ({
    name: `${viewport.name}-${theme}`,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: theme,
    },
    metadata: { viewport: viewport.name, theme },
  })),
);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:14321",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects,
  webServer: {
    command: "npm run preview -- --port 14321",
    url: "http://127.0.0.1:14321/",
    timeout: 30_000,
    reuseExistingServer: false,
  },
});
