import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const origin = "https://kaori.cloud";
const trackerUrl = "https://analytics.kaori.cloud/script.js";
const configPath = "/.well-known/kaori-analytics/config.json";
const config = {
  schema: 1,
  enabled: true,
  hostname: "kaori.cloud",
  trackerUrl,
  websiteId: "11111111-1111-4111-8111-111111111111",
};

async function mockProvider(
  page: Page,
  request: APIRequestContext,
  localOrigin: string,
  runtimeConfig: unknown,
  outage = false,
) {
  let trackerRequests = 0;
  let configRequests = 0;
  // Every browser request is intercepted. The canonical host serves local
  // build bytes; the provider is always a mock, never production Umami.
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.href === trackerUrl) {
      trackerRequests += 1;
      if (outage) return route.abort();
      return route.fulfill({
        contentType: "application/javascript",
        body: `
          window.kaoriMockEvents = [];
          window.umami = {
            track(name) {
              const payload = window.umamiConfig.beforeSend("event", {
                name, url: location.href, data: { private: "secret-data" }
              });
              if (payload) window.kaoriMockEvents.push(payload);
              return Promise.resolve();
            }
          };
        `,
      });
    }
    if (url.origin !== origin) return route.abort();
    if (url.pathname === configPath) {
      configRequests += 1;
      if (runtimeConfig === null) return route.fulfill({ status: 404 });
      return route.fulfill({ json: runtimeConfig });
    }
    const localUrl = new URL(url.pathname + url.search, localOrigin).href;
    const response = await request.get(localUrl);
    return route.fulfill({ response });
  });
  return {
    trackerRequests: () => trackerRequests,
    configRequests: () => configRequests,
  };
}

const events = (page: Page) => page.evaluate(() => Reflect.get(window, "kaoriMockEvents") ?? []);

async function clickApplication(page: Page) {
  // Prevent navigation in the fixture, not in the production analytics loader.
  const application = page.locator('a[href="https://app.kaori.cloud"]').first();
  await application.evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    (link as HTMLAnchorElement).click();
  });
}

test("consent and sanitized events", async ({ page, request, baseURL }) => {
  const mock = await mockProvider(page, request, baseURL!, config);
  await page.goto(origin + "/?token=private-value#private-fragment", {
    referer: "https://referrer.example/private-path?token=secret",
  });
  await expect(page.getByText("Analytics privacy", { exact: true })).toBeVisible();
  expect(mock.trackerRequests()).toBe(0);
  expect(mock.configRequests()).toBe(0);

  await page.getByText("Analytics privacy", { exact: true }).click();
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await expect.poll(() => events(page)).toHaveLength(1);
  expect(mock.trackerRequests()).toBe(1);
  const initial = (await events(page))[0];
  expect(initial).toMatchObject({
    website: config.websiteId,
    hostname: config.hostname,
    url: "/",
  });
  const sensitive = /private-value|private-fragment|private-path|secret-data/;
  expect(JSON.stringify(initial)).not.toMatch(sensitive);
  expect(["", "https://referrer.example"]).toContain(initial.referrer);

  await page.evaluate(() => window.dispatchEvent(new Event("kaori:analytics-route")));
  await expect.poll(() => events(page)).toHaveLength(1);

  await clickApplication(page);
  await expect.poll(() => events(page)).toHaveLength(2);
  expect((await events(page)).at(-1).name).toBe("open_application");
  expect((await events(page)).at(-1)).not.toHaveProperty("data");

  const disable = page.getByRole("button", { name: "Disable analytics" });
  if (!(await disable.isVisible())) {
    await page.getByText("Analytics privacy", { exact: true }).click();
  }
  await disable.click();
  await clickApplication(page);
  expect(await events(page)).toHaveLength(2);
});

for (const [label, runtimeConfig] of [
  ["absent", null],
  ["disabled", { ...config, enabled: false }],
  ["wrong host", { ...config, hostname: "example.com" }],
  ["invalid UUID", { ...config, websiteId: "invalid" }],
  ["unapproved tracker", { ...config, trackerUrl: "https://example.com/script.js" }],
] as const) {
  test(`fails closed for ${label} config`, async ({ page, request, baseURL }) => {
    const mock = await mockProvider(page, request, baseURL!, runtimeConfig);
    await page.addInitScript(() => localStorage.setItem("kaori-analytics-consent", "allow"));
    await page.goto(origin + "/");
    await expect.poll(() => mock.configRequests()).toBe(1);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    expect(mock.trackerRequests()).toBe(0);
    await expect(page.locator(`script[src="${trackerUrl}"]`)).toHaveCount(0);
  });
}

test("GPC prevents tracking", async ({ page, request, baseURL }) => {
  const mock = await mockProvider(page, request, baseURL!, config);
  await page.addInitScript(() => {
    localStorage.setItem("kaori-analytics-consent", "allow");
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true });
  });
  await page.goto(origin + "/");
  await expect(page.getByText("Analytics privacy", { exact: true })).toBeVisible();
  expect(mock.configRequests()).toBe(0);
  expect(mock.trackerRequests()).toBe(0);
});

test("tracker outage preserves UX", async ({ page, request, baseURL }) => {
  const mock = await mockProvider(page, request, baseURL!, config, true);
  await page.addInitScript(() => localStorage.setItem("kaori-analytics-consent", "allow"));
  await page.goto(origin + "/");
  await expect.poll(() => mock.trackerRequests()).toBe(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const link = page.locator('a[href="https://app.kaori.cloud"]:visible').first();
  await expect(link).toBeVisible();
});
