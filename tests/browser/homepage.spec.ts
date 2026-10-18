import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const screenshots = [
  ["#how-it-works", "journey"],
  ["#integrations", "integrations"],
  ["#experience", "experience"],
] as const;

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto("/");
  const theme = testInfo.project.metadata.theme;
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
    await page.getByRole("button", { name: /switch to (light|dark) mode/i }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", String(theme));
});

test("capture reviewed candidate evidence for all major sections", async ({ page }, testInfo) => {
  await page.evaluate(() => document.fonts.ready);
  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await testInfo.attach("homepage-full.png", { body: screenshot, contentType: "image/png" });

  for (const [selector, name] of screenshots) {
    const section = page.locator(selector);
    await expect(section).toBeVisible();
    const image = await section.screenshot({ animations: "disabled" });
    await testInfo.attach(`${name}.png`, { body: image, contentType: "image/png" });
  }
});

test("navigate and preserve theme through the real control", async ({ page }) => {
  const journey = page.locator("#how-it-works");
  await expect(journey).toBeVisible();
  const jump = page.locator("a[href='#how-it-works']").first();
  await jump.click();
  await expect(page).toHaveURL(/#how-it-works$/);

  const themeButton = page.getByRole("button", { name: /switch to (light|dark) mode/i });
  const initial = await page.locator("html").getAttribute("data-theme");
  await themeButton.click();
  const alternate = initial === "dark" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-theme", alternate);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", alternate);

  const application = page.getByRole("link", { name: /open application/i }).first();
  await expect(application).toHaveAttribute("href", "https://app.kaori.cloud");
});

test("filter integrations with accurate state and results", async ({ page }) => {
  const filters = page.locator("[data-integration-filter]");
  await expect(filters.first()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Storage", exact: true }).click();
  await expect(page.getByRole("button", { name: "Storage", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const visible = page.locator("[data-integration-item]:visible");
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText("S3-compatible");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator("[data-integration-item]:visible")).toHaveCount(6);
});

test("enforce responsive geometry and focus visibility", async ({ page }) => {
  const width = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(width.document, JSON.stringify(width)).toBeLessThanOrEqual(width.viewport + 1);

  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    const box = active.getBoundingClientRect();
    const css = getComputedStyle(active);
    return {
      visible: box.width > 0 && box.height > 0,
      outline: css.outlineStyle !== "none" && css.outlineWidth !== "0px",
      shadow: css.boxShadow !== "none",
    };
  });
  expect(focus?.visible).toBe(true);
  expect(focus?.outline || focus?.shadow).toBe(true);
});

test("produce automated WCAG rule results without claiming manual coverage", async ({
  page,
}, testInfo) => {
  const findings = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach("axe-results.json", {
    body: JSON.stringify(findings, null, 2),
    contentType: "application/json",
  });
  expect(
    findings.violations,
    findings.violations.map((finding) => `${finding.id}: ${finding.nodes.length}`).join("; "),
  ).toEqual([]);
});

test("collect lab-only layout shift and largest paint evidence", async ({ page }, testInfo) => {
  const metrics = await page.evaluate(async () => {
    const supported = PerformanceObserver.supportedEntryTypes;
    const lcp = performance.getEntriesByType("largest-contentful-paint");
    const cls = performance.getEntriesByType("layout-shift");
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return {
      measuredAt: new Date().toISOString(),
      source: location.pathname,
      observerSupportsLcp: supported.includes("largest-contentful-paint"),
      observerSupportsCls: supported.includes("layout-shift"),
      largestPaintMs: lcp.length ? lcp[lcp.length - 1].startTime : null,
      clsScore: cls.reduce(
        (total, entry) => total + ((entry as PerformanceEntry & { value?: number }).value ?? 0),
        0,
      ),
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      inpFieldP75: null,
    };
  });
  await testInfo.attach("lab-performance.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.domContentLoadedMs).not.toBeNull();
  // INP needs real-user field observations at the 75th percentile, not a synthetic click.
  expect(metrics.inpFieldP75).toBeNull();
});
