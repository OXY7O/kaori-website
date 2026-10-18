# KAORI Website Home Page — Visual Review Contract

## Authority

- OXY7O/KAORI/docs/product/README.md
- OXY7O/KAORI/docs/design/KAORI_DESIGN_SYSTEM.md
- OXY7O/KAORI/docs/design/components/DARK_MODE.md
- Approved Option 3 editorial infrastructure storytelling concept (light + dark).

## Page scope

Single public informational Home Page at `https://kaori.cloud` only. It is not a live source of operational truth and does not require KAORI authentication. All **Open Application** CTAs navigate to the separate KAORI application at `https://app.kaori.cloud` (authority `OXY7O/KAORI#2210`), rather than back to the landing page.

## Structure

1. Public navigation with theme toggle
2. Hero — Meet KAORI. Operate with Clarity. (official KAORI acronym)
3. Evidence-first / provider-authoritative operating principles
4. Platform capability domains
5. Domain-filterable integration ecosystem examples (illustrative, scalable)
6. External authority → KAORI normalized context, workflows, evidence and governance → operational clarity
7. Clearly-marked conceptual product experience
8. Curiosity-led CTA and owner/contact footer

## Safety / accuracy

- Never present a mocked number as a KAORI performance metric or integration coverage claim.
- Example vendor technology names are not a per-provider readiness guarantee.
- UI concept and hero illustration must be labeled as such.
- Never embed real environment IPs, credentials, audit records, cluster identities, company data or sensitive screenshots.
- Product descriptions are inherited from the KAORI product authority. Not open source.

## Visual acceptance pending

- Desktop >=1280 light/dark
- Tablet 768–1024 light/dark
- Mobile 375–430 light/dark
- Keyboard navigation, theme toggle persistence, WCAG text contrast, focus visible, reduced-motion preference
- No horizontal overflow or clipping, browser runtime and screenshot review
- Public website canonical/OG URL points to `https://kaori.cloud`; Open Application links point to `https://app.kaori.cloud` and do not self-link
- Verify CTA destinations after application hostname and apex DNS/TLS publication; no broken destination links
- Human acceptance after staging integration

Developer source/build checks are distinct from release verification. Its original foundation prerequisite #2 has been integrated into staging; final browser verification and human acceptance remain pending.

## Approved brand alignment implementation — issue #27

The maintainer approved full-section website mockups and required parity with the existing KAORI Application iconography and login visual language. This work retains the approved **editorial public website**: neutral-first surfaces with genuine light/dark parity, four capability domains, illustrative integration examples, capability-first architecture and explicitly conceptual product preview.

- Official logo: `public/branding/kaori-logo.svg` matches the application's canonical `app/static/images/kaori-logo.svg`.
- Official operations-fabric artwork: `public/branding/kaori-operations-fabric.svg` copied **unchanged** from application `app/static/images/kaori-login-operations-fabric.svg`, source of truth in `OXY7O/KAORI`.
- Iconography: semantic Lucide-style paths via `src/components/Icon.astro` with the same stroke vocabulary as the KAORI Application, never invented provider logo glyphs.
- Capability/technology cards and diagrams are editorial explanations, **not live operational widgets**. Never fabricate inventory counts, SLIs, security posture or integration status.
- All public application links target `https://app.kaori.cloud`; private application repository links are withheld from the public footer. Both light and dark modes retain the Violet/Inter family identity.

**Release checks still required:** 1366/1440 desktop, 768/1024 tablet, 375/390/430 mobile, keyboard navigation/focus and 200% zoom, no clipping, explicit concept text, real browser CTA tests, all three domain health checks, distinct signed source SHA/digest and human review. Successful code checks do not by themselves prove Visual QA or final acceptance.

## Homepage RC follow-up: full-page audit remediation — #36

Maintainer screenshot review approved a targeted visual refinement, not a wholesale platform redesign. Authority remains KAORI product direction and Violet design system. All new homepage copy describes **capabilities and architecture**, without claiming a given provider or future capability is GA.

- **Hero:** canonical brand identity, `Meet KAORI. Operate with Clarity.`, and the official acronym **Knowledge, Automation, Operations, Resilience & Intelligence**. Replace the framed login artwork with a cohesive accessible diagram of the four operating pillars. The concept disclaimer remains visible.
- **Light/dark:** root `data-theme` selected by the existing initial mode bootstrap and toggle must visibly drive header, Hero, principle strip, capability section, filtered integration catalog, architecture cards, illustrative workspace, CTA, footer and text. Avoid dark fixed surfaces in light mode; ensure contrast in both modes.
- **Principles:** retain the compact four-column editorial strip, increase readable font sizes and differentiate Source authority from Governed by design icons.
- **Capabilities:** preserve domain-first grouping; smaller decorative orb and improved typography without implying cards are interactive.
- **Integrations:** dynamic examples list separated from provider capability authority, with accessible domain filters, matching results count and scalable progressive disclosure. Do not imply illustrated providers are live/connected; adding additional examples must not require redesign.
- **Architecture:** external systems authoritative; KAORI normalizes, orchestrates, correlates, commits evidence, governs; output is shared context and clarity. Diagram must not describe KAORI as passive middleware.
- **Experience:** accessible illustration rather than fake data screenshot; committed evidence, relationships and governed workflows; no invented performance or counts.
- **CTA:** curiosity-led `Discover how KAORI works.` paired with clear link to authorized app and architecture.
- **Footer:** maintainer-provided owner Lethisa Putri and `lethisaputri@gmail.com` with functional `mailto:` contact; do not invent social profiles. Keep existing OXY7 ORBITAL attribution.

**Mandatory real-browser gate before human acceptance:** check loaded CSS and initial theme/persistence (light/dark) across all sections, 1366/1440 desktop, 768/1024 tablet, 375/390/430 mobile, 200% zoom, no horizontal overflow, accessible category filtering/keyboard/ARIA pressed, reduced-motion and contrast. Browser PASS requires actual evidence beyond Astro build or HTTPS readiness. A successful signed RC/host deploy allows review but does not close #3 automatically.

## Maintainer-approved focused artwork and ecosystem refinement — #41

Follow-up to the live RC.5 browser review. **This approval concerns the exact picture and copy direction, not a final UAT acceptance or main promotion.**

- The Hero's right-hand visual uses the maintainer-approved generated KAORI Connected Operations Hub illustration rather than the previous CSS-built diagram. The approved image was **cropped only to remove the now-unwanted lower caption**, then resized and compressed as `public/branding/kaori-connected-operations-hub.webp` (800 × 519, 12,444 bytes). Binary Git blob `217f093c6c04c2201a4f01a26e8e6bb7edce68a8`, SHA-256 `5efdb04159f06d4572b5181c774e67bf9b8420f405512a105d1ee951c032846a`. No new drawing was generated. Non-decorative alt text names KAORI, Visibility, Control, Intelligence, and Assurance.
- The standalone visible `Concept illustration · Not a live infrastructure view` caption is intentionally removed. Do not claim the diagram represents live infrastructure activity elsewhere in text.
- Replace the detached `Capability-first · Provider-second` token with a branded Violet statement, `Capabilities lead. Tools connect.`, explaining source authority without naming providers as necessarily GA-integrated.
- Hide `X of Y examples` marketing counters while keeping semantic `aria-live` announcements for category filtering; retain accessible filters and progressive disclosure.
- Introduce a concise Violet-dot ecosystem statement instead of the technical, apologetic availability disclaimer. The public copy must not imply all provider examples are connected or GA-supported; integration readiness remains governed in KAORI.
- Remove only the redundant `Get in touch` mailto-with-subject button; retain Lethisa Putri's actual contact email and working `Contact us` link.

Before acceptance: confirm the artwork actually loads from the **signed deployed digest** in Firefox/Chromium and light/dark, with no caption leakage or stretching; category/filter behavior, readable Violet panel, footer contact on mobile/desktop, and the existing app/edge readiness. Static build and HTTPS health do not prove a visual PASS.

## RC.6 post-deployment visual review — six copy and contrast fixes (#46)

Maintainer's six screenshot findings require a **targeted** change, preserving the accepted visual system and approved hero WebP. Do not infer browser Visual QA PASS from a successful code build.

1. **Hero:** supporting text must form two intentional lines on normal desktop widths (1366/1440), retaining explicit committed-evidence and external-authority intent; tablet/mobile should reflow naturally.
2. **Integration outlook:** concise and credible sentence with Violet dot, one line on large desktops, normal wrap on narrower viewports.
3. **Violet statement card:** screenshot confirms **FAIL** in light mode: dark supporting copy blends into violet background. The root cause is the general `.section-heading-row p:not(.eyebrow)` rule outranking `.ecosystem-principle p`; apply an explicit high-contrast text override to the _nested_ panel paragraph, without global `!important` or new theme taxonomy.
4. **Architecture:** two-line desktop copy preserving domain context, governed workflows, committed evidence and external authoritative boundaries.
5. **Product experience:** two desktop lines expressing evidence and governed-workflow concepts without claiming live data; preview still identifies itself as illustrative.
6. **Footer:** two concise rows — official five-term acronym and OXY7 ORBITAL attribution — with measured bold Violet accents, not entire paragraph in Violet.

**Recheck visually after signed deployment:** desktop 1366/1440 light/dark line counts and readability, keyboard/focus and text zoom, tablet 768/1024, mobile 375/390/430, all CTA targets, no overflow. Existing app and automation edge availability and the signed image identity must stay intact. Human acceptance #3 remains required.

## Mobile homepage visual polish — #91 (2026-10-19)

New maintainer screenshots from public `kaori.cloud` showed an orphan acronym separator, Hero copy `evidence.It`, visually clipped mobile capability artwork and narrow descriptions, plus disproportionately spaced mobile sections. This bounded visual remediation preserves the approved Option 3 editorial structure, KAORI Violet tokens, official brand assets, provider-authoritative claims, and the existing conceptual Product Experience; it does not claim live application screenshots.

- Explicitly separate Hero and architecture sentence spans on sub-1100px layouts, following the admitted Product Experience whitespace regression pattern (#53 / PR #89).
- At <=540px present each capability card as a mobile grid: canonical icon/tag and fully contained orbit artwork in the header row, with the title and readable description across full card width below. Do not hide clipping with page-level overflow, modify domain content or add fake status indicators.
- Use a shared wrap-safe acronym presentation for the Hero and footer so individual terms and their separator stay together. Preserve official five-term acronym and approved selective Violet emphasis.
- Keep product CTA naming and destination consistent (`Open Application` → `https://app.kaori.cloud`), improve small-screen typography, spacing and supporting-note readability without introducing a second design system.
- Extend the existing Playwright 12-project viewport/light-dark suite with actual rendered sentence-spacing, acronym-term, application destination and mobile card bounds/font-size checks. These tests complement—not replace—real screenshot, keyboard, screen-reader and 200% zoom acceptance.

**Required admission and release evidence:** source/formatter/Astro/build Developer Check on exact PR SHA; reviewed merge into `kaori/staging`; same-SHA Full Admission, Container and Browser Quality Evidence; inspect six viewport widths in both themes, iOS Safari and zoom manually where available; issue-authorized new immutable signed candidate, scan/SBOM/provenance and guarded public deployment; maintainer Human Acceptance of the deployed visual baseline before `main`. A CI PASS does not prove public runtime promotion or visually accepted layout. Existing #53 sanitized real-product media remains separately gated on approval.
