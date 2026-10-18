# KAORI Website Browser QA — Candidate Evidence

## Authority and scope

Issue [#58](https://github.com/OXY7O/kaori-website/issues/58) establishes browser quality evidence for the public website. Reuse the KAORI application [Visual QA standard](https://github.com/OXY7O/KAORI/blob/main/docs/design/KAORI_VISUAL_QA.md): six canonical viewport widths (1440, 1280, 1024, 768, 390, 360), light/dark via the **real theme control**, machine-enforced geometry, candidate screenshot artifacts, and independent human baseline approval.

Current implementation uses pinned Playwright 1.56.1 and @axe-core/playwright 4.10.2 in the committed npm lockfile. Browser binary is installed explicitly by a CI step, not pulled into the production website. A failed browser install or test is **FAIL/BLOCKED**, never reported PASS.

## Execute locally in the website DevContainer

```bash
npm ci --no-audit --no-fund
npx playwright install chromium
npm run build
npm run test:browser
```

For Linux system dependencies, provision the environment once using a reviewed DevContainer/runner image or the Playwright-supported `install-deps` operation; do not add unchecked privileged `sudo` commands to CI. Browser test runner starts the static Astro preview on loopback port `14321`. The DevContainer exposes `4321` only; forwarding `14321` is optional for manual troubleshooting, not required for headless automation.

## Evidence and release boundary

Playwright captures full-page, journey, integration and product preview screenshots across all 12 viewport/theme combinations plus JSON results and traces on failures. The existing **Full Admission** workflow must upload these as short-lived immutable per-run evidence linked to commit SHA, not commit them as production UI assets. No source-controlled baseline is silently updated. Human reviewer must explicitly accept image changes before baseline capture/promotion.

Automated axe tags cover WCAG 2.0/2.1/2.2 A/AA rules that axe can execute. **Passing axe cannot establish all WCAG 2.2 AA criteria**: manual keyboard, screen-reader, contrast, 200% browser zoom and real-device verification remain required.

The browser lab report records navigation and paint/layout signals with `inpFieldP75: null`. Treat LCP ≤2.5 seconds, CLS ≤0.1, INP ≤200 ms at field p75 as **targets**, not PASS unless collected from actual field telemetry. The planned Lighthouse/field-data workstream is distinct from these preliminary lab records. No invented INP or Lighthouse grade is permitted.

## Acceptance

- [ ] Developer Check, source admission, browser execution and actual screenshots PASS on SHA.
- [ ] Failed screenshots/axe rules emit actionable artifacts; no auto-accept.
- [ ] Human light/dark and desktop/mobile evidence review completed.
- [ ] Independent Lighthouse lab budgets and field p75 Core Web Vitals evidence are added before closing #58.

## Browser runtime isolation remediation — #58

[Staging run #39126351997](https://github.com/OXY7O/kaori-website/actions/runs/39126351997) executed all 72 tests but each failed before page navigation because the self-hosted runner lacks required Linux Chromium libraries. The exact-SHA failure artifact was retained. The existing `browser-evidence` job now uses Microsoft's version-matched `mcr.microsoft.com/playwright:v1.56.1-noble` image on the **existing self-hosted kaori-ci runner**, with `--init --ipc=host --user 1001` as documented by Playwright. The image includes browser binaries and Linux libraries; `npm ci` continues installing the locked `@playwright/test@1.56.1` and `@axe-core/playwright` packages. The job checks its CLI version before the test matrix.

This is isolated to the Browser Quality Evidence job; the application's production image, canonical workflow trigger, other admission jobs, CI runner OS, and deployment are not changed. Do not install `sudo playwright install-deps` or mutate the shared CI host from a test job. The container tag is version-pinned but not an immutable OCI digest; evaluate a registry-verified SHA digest once the exact signed container provenance is available. Container startup and screenshot compatibility must be confirmed in real GitHub Actions before claiming PASS. Automated axe checks are not a replacement for manual accessibility acceptance or Lighthouse/field Core Web Vitals.

## Runner container checkout permission follow-up — #58

The [first containerized run #39128209246](https://github.com/OXY7O/kaori-website/actions/runs/39128209246) succeeded at the Full Admission and Container Admission jobs, but the browser job failed before tests when the container's explicit non-root UID could not write GitHub runner-owned `/__w/_temp/_runner_file_commands/save_state_*` files (`EACCES`). The Browser Quality Evidence container now uses the official image default user so GitHub actions/checkout can write its existing ephemeral runner state; only this isolated job is affected. Container-internal root does **not** change the underlying host UID, privileged host packages, or production image, but Chromium sandboxing is not available with root, per Playwright documentation. Run only the locally built, trusted KAORI website preview in this test container; no untrusted external websites or live credentials are needed. Continue to evaluate a permission-compatible non-root runner design in a separate security review if required. No browser PASS is asserted until actual tests execute.

## Responsive navigation fixture correction — #58

After Playwright's container-dependency and GitHub runner-state issues were resolved, [Full Admission run #39128708483](https://github.com/OXY7O/kaori-website/actions/runs/39128708483) executed all 72 cases: **66 PASS, 6 FAIL**. Failures occurred solely in the navigation/theme test on tablet and phone viewports because `a[href='#how-it-works']`.first() selected the hidden desktop navigation link. The website also contains a visible, semantically equivalent Hero link. Select `a[href='#how-it-works']:visible` for responsive user navigation; do not force-click hidden links, mutate DOM visibility or skip mobile tests. Run the entire suite again; screenshots and axe evidence remain unaccepted until actual final PASS and human baseline review. This selector adjustment changes tests only, not application navigation or production artifacts.

## Self-hosted workspace permission remediation — #58

[Run #39129327805](https://github.com/OXY7O/kaori-website/actions/runs/39129327805) failed Full Admission checkout: the previous root-user browser container wrote generated `.astro/` and `test-results/` files into the bind-mounted self-hosted runner checkout, leaving them root-owned. GitHub Actions could not clean the source directory, reporting EACCES. This is not a product source or visual-test failure.

Two bounded ownership steps address this **without mutating runner OS packages, Docker configuration, secrets or the production service**: before the Full Admission checkout, reuse the previously version-pinned Microsoft Playwright container with no network, mounted to **only the current `GITHUB_WORKSPACE`**, and restore ownership to the executing self-hosted CI user. After browser job artifact upload, restore `GITHUB_WORKSPACE` ownership from the mounted `RUNNER_TEMP` owner. The browser process remains isolated to the existing Playwright job; source branch/merge SHA security gates are unchanged.

This is a security-sensitive self-hosted runner workspace mutation. The target directory, image/tag, user and exact commands must be reviewed in PR. Root is limited to the temporary browser container and one network-isolated repair container, not the host. Verify the resulting workspace and full staging/browser admission; delete the pre-checkout recovery operation when no longer required by historical artifacts if a simpler permanent non-root solution is approved. Never run a generic privileged host package repair or delete historical GitHub Actions evidence for cosmetics.

## Observed laboratory LCP/CLS budget — #58

The original evidence probe called `performance.getEntriesByType('largest-contentful-paint')` and `performance.getEntriesByType('layout-shift')`, which do not provide those buffered event entries in Chromium. The updated canonical Playwright test installs `PerformanceObserver` **before navigation**, retains buffered Largest Contentful Paint entries and aggregates non-user-input layout-shift values, and attaches one `lab-performance.json` per viewport/theme test. The observed loopback lab budgets are **LCP ≤2500 ms** and **conservative cumulative shift sum ≤0.1**; failures fail CI and remain actionable. The conservative shift sum is _not_ the Core Web Vitals session-window CLS algorithm. Runner timings are nonportable proxies, not proof that real visitors meet Web Vitals p75, and are not a Lighthouse audit. Do not infer field INP p75, field LCP/CLS p75, a Lighthouse grade or manual accessibility PASS. Lighthouse budgets, actual field telemetry, explicit screenshot baseline approval and 200% zoom/keyboard human review must be completed before issue #58 closure or claiming full WCAG 2.2 AA compliance.
