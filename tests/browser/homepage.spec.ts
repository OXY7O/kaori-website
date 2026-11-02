import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const screenshots = [
  ["#how-it-works", "journey"],
  ["#integrations", "integrations"],
  ["#experience", "experience"],
] as const;

test.beforeEach(async ({ page }, testInfo) => {
  // Install observers before navigation: getEntriesByType() does not report LCP/CLS.
  await page.addInitScript(() => {
    const vitals = {
      largestPaintMs: null as number | null,
      clsScore: 0,
      layoutShiftEvents: [] as Array<{
        value: number;
        timeMs: number;
        sources: Array<{ element: string | null; beforeY: number | null; afterY: number | null }>;
      }>,
    };
    Object.assign(window, { __kaoriLabVitals: vitals });

    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          vitals.largestPaintMs = entry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }

    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
            sources?: Array<{
              node?: Node | null;
              previousRect?: DOMRectReadOnly;
              currentRect?: DOMRectReadOnly;
            }>;
          };
          if (!shift.hadRecentInput) {
            vitals.clsScore += shift.value ?? 0;
            vitals.layoutShiftEvents.push({
              value: shift.value ?? 0,
              timeMs: shift.startTime,
              sources: (shift.sources ?? []).map((source) => ({
                element:
                  source.node instanceof Element
                    ? `${source.node.tagName.toLowerCase()}.${String(source.node.className)
                        .trim()
                        .replace(/\s+/g, ".")}`
                    : null,
                beforeY: source.previousRect?.y ?? null,
                afterY: source.currentRect?.y ?? null,
              })),
            });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
  await page.goto("/");
  const theme = testInfo.project.metadata.theme;
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
    await page.getByRole("button", { name: /switch to (light|dark) mode/i }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", String(theme));
});

test("capture reviewed candidate evidence for all major sections", async ({ page }, testInfo) => {
  const description = page.locator("#experience .section-intro > p:not(.eyebrow):not(.small-note)");
  await expect(description).toHaveText(/evidence\.\s+Explore governed workflows/);
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

test("protect mobile copy and capability artwork", async ({ page }) => {
  const hero = page.locator(".hero-description");
  const architecture = page.locator("#architecture .section-intro > p:not(.eyebrow)");
  const application = page.locator("#experience .button-primary");

  await expect(hero).toHaveText(/evidence\.\s+It governs workflows/);
  await expect(architecture).toHaveText(/evidence\.\s+External systems/);
  await expect(application).toHaveText("Open Application");
  await expect(application).toHaveAttribute("href", "https://app.kaori.cloud");
  await expect(page.locator(".hero-micro .acronym-terms > span")).toHaveCount(5);
  await expect(page.locator(".footer-acronym > span")).toHaveCount(5);

  if ((page.viewportSize()?.width ?? 0) <= 540) {
    for (const card of await page.locator("#platform .capability-card").all()) {
      const box = await card.boundingBox();
      const art = await card.locator(".capability-art").boundingBox();
      const title = await card.locator("h3").boundingBox();
      expect(box).not.toBeNull();
      expect(art).not.toBeNull();
      expect(title).not.toBeNull();
      expect(art!.x).toBeGreaterThanOrEqual(box!.x);
      expect(art!.x + art!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
      expect(title!.y).toBeGreaterThanOrEqual(art!.y + art!.height - 1);
      await expect(card.locator("p")).toHaveCSS("font-size", "12px");
    }
  }
});

test("align Product Experience auth note icon with text at every viewport", async ({ page }) => {
  const note = page.locator("#experience .small-note");
  await expect(note).toContainText(
    "Application access is subject to existing authentication and permissions.",
  );
  await expect(note).toHaveCSS("display", "flex");

  const geometry = await note.evaluate((element) => {
    const icon = element.querySelector("svg");
    const text = element.querySelector("span");
    if (!icon || !text) return null;
    const iconBox = icon.getBoundingClientRect();
    const textBox = text.getBoundingClientRect();
    const parentBox = element.getBoundingClientRect();
    return {
      iconLeft: iconBox.x,
      iconRight: iconBox.right,
      iconTop: iconBox.top,
      textLeft: textBox.x,
      textTop: textBox.top,
      textRight: textBox.right,
      parentRight: parentBox.right,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.textLeft).toBeGreaterThanOrEqual(geometry!.iconRight + 6);
  expect(Math.abs(geometry!.iconTop - geometry!.textTop)).toBeLessThanOrEqual(6);
  expect(geometry!.textRight).toBeLessThanOrEqual(geometry!.parentRight + 1);
});

test("keep mobile acronym rows and filter overflow stable", async ({ page }) => {
  if ((page.viewportSize()?.width ?? 0) > 540) return;

  for (const selector of [".hero-micro .acronym-terms", ".footer-acronym"]) {
    const terms = page.locator(`${selector} > span`);
    await expect(terms).toHaveCount(5);
    const tops = await terms.evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
    );
    expect(tops[0]).toBe(tops[1]);
    expect(tops[1]).toBe(tops[2]);
    expect(tops[3]).toBeGreaterThan(tops[0] + 4);
    expect(tops[3]).toBe(tops[4]);
    const separator = await terms.nth(3).evaluate((node) => {
      const style = getComputedStyle(node, "::before");
      return style.content;
    });
    expect(separator).toBe("none");
  }

  const filters = page.locator(".integration-filters");
  await expect(filters).toHaveCSS("flex-wrap", "nowrap");
  await expect(filters).toHaveCSS("overflow-x", "auto");
  const dimensions = await filters.evaluate((element) => ({
    viewport: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(dimensions.scroll).toBeGreaterThan(dimensions.viewport);

  const registry = page.getByRole("button", { name: "Registry", exact: true });
  await registry.click();
  await expect(registry).toHaveAttribute("aria-pressed", "true");
  const visible = page.locator("[data-integration-item]:visible");
  await expect(visible).toHaveCount(1);
  await expect(visible).toContainText("Harbor");

  const cta = page.locator("#experience .section-intro > .button");
  await expect(cta).toHaveAttribute("href", "https://app.kaori.cloud");
  const widths = await cta.evaluate((element) => {
    const container = element.parentElement;
    return {
      button: element.getBoundingClientRect().width,
      content: container?.getBoundingClientRect().width ?? 0,
      computed: getComputedStyle(element).width,
    };
  });
  expect(widths.button, JSON.stringify(widths)).toBeGreaterThanOrEqual(widths.content - 1);
  await expect(page.locator("#experience .small-note")).toContainText(
    "authentication and permissions",
  );
});

test("distinguish public Docs in preparation from the authenticated application", async ({ page }) => {
  const docsUrl = "https://docs.kaori.cloud/";
  const desktopDocs = page.locator(".desktop-links a[href='https://docs.kaori.cloud/']");
  const mobileDocs = page.locator(".mobile-nav a[href='https://docs.kaori.cloud/']");
  const footerDocs = page.locator(".footer-links a[href='https://docs.kaori.cloud/']");

  await expect(desktopDocs).toHaveCount(1);
  await expect(mobileDocs).toHaveCount(1);
  await expect(footerDocs).toHaveCount(1);
  await expect(desktopDocs).toHaveAttribute("href", docsUrl);
  await expect(desktopDocs).toHaveAttribute("aria-label", "Docs (in preparation)");
  await expect(footerDocs).toContainText("Documentation (in preparation)");
  await expect(mobileDocs).toContainText("Docs (in preparation)");

  for (const docsLink of [desktopDocs, mobileDocs, footerDocs]) {
    await expect(docsLink).toHaveAttribute("target", "_blank");
    await expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  }

  if ((page.viewportSize()?.width ?? 0) <= 800) {
    await page.locator(".mobile-nav summary").click();
    await expect(mobileDocs).toBeVisible();
    await expect(desktopDocs).toBeHidden();
  } else {
    await expect(desktopDocs).toBeVisible();
    await expect(mobileDocs).toBeHidden();
  }
  await expect(page.locator(".nav-app-link")).toHaveAttribute("href", "https://app.kaori.cloud");
});

test("navigate and preserve theme through the real control", async ({ page }) => {
  const journey = page.locator("#how-it-works");
  await expect(journey).toBeVisible();
  const jump = page.locator("a[href='#how-it-works']:visible").first();
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

test("collect browser-observed lab paint and layout shift budgets", async ({ page }, testInfo) => {
  // The static loopback preview is a laboratory proxy, never CrUX/real-user p75.
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const data = (window as Window & { __kaoriLabVitals?: { largestPaintMs: number | null } })
            .__kaoriLabVitals;
          return data?.largestPaintMs ?? null;
        }),
      { timeout: 5_000 },
    )
    .not.toBeNull();

  const metrics = await page.evaluate(() => {
    const vitals = (
      window as Window & {
        __kaoriLabVitals?: {
          largestPaintMs: number | null;
          clsScore: number;
          layoutShiftEvents: unknown[];
        };
      }
    ).__kaoriLabVitals;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return {
      measuredAt: new Date().toISOString(),
      source: location.pathname,
      measurement: "local-loopback-chromium-lab-not-field-p75",
      observerSupportsLcp: PerformanceObserver.supportedEntryTypes.includes(
        "largest-contentful-paint",
      ),
      observerSupportsCls: PerformanceObserver.supportedEntryTypes.includes("layout-shift"),
      largestPaintMs: vitals?.largestPaintMs ?? null,
      // Conservative cumulative shift total, not the web-vitals session-window field CLS.
      clsScore: vitals?.clsScore ?? null,
      layoutShiftEvents: vitals?.layoutShiftEvents ?? [],
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      labLcpBudgetMs: 2_500,
      labClsConservativeBudget: 0.1,
      inpFieldP75: null,
    };
  });
  await testInfo.attach("lab-performance.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.observerSupportsLcp).toBe(true);
  expect(metrics.observerSupportsCls).toBe(true);
  expect(metrics.domContentLoadedMs).not.toBeNull();
  expect(metrics.largestPaintMs).not.toBeNull();
  expect(metrics.clsScore).not.toBeNull();
  expect(metrics.largestPaintMs!).toBeLessThanOrEqual(metrics.labLcpBudgetMs);
  expect(metrics.clsScore!).toBeLessThanOrEqual(metrics.labClsConservativeBudget);
  // No field telemetry exists yet: do not synthesize INP or a Lighthouse score.
  expect(metrics.inpFieldP75).toBeNull();
});
