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
