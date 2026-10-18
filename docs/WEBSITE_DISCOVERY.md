# KAORI Website Discovery and Quality Evidence

Implementation authority: [#52](https://github.com/OXY7O/kaori-website/issues/52), website benchmark [#3](https://github.com/OXY7O/kaori-website/issues/3).

## Public discovery contract

- Canonical origin: `https://kaori.cloud/`.
- Open Graph and Twitter use the already-approved, deployed, public WebP brand illustration at `/branding/kaori-connected-operations-hub.webp` (800 × 519). It is a brand visual, **not** a production screenshot.
- JSON-LD describes only the **WebSite** and currently rendered **WebPage**, with no unverified customer counts, support guarantees, security certifications, ratings, sales, legal organization status, or product pricing.
- `robots.txt` allows discovery of the one public marketing route and advertises `sitemap.xml`. Do not include app/login or operational tenant paths.
- The sitemap explicitly lists the only implemented public page. Update sitemap whenever a new public route ships; do not advertise private endpoints.

## Quality budgets (targets, not measurements)

- Core Web Vitals (field 75th percentile): LCP <=2.5s, INP <=200ms, CLS <=0.1.
- WCAG 2.2 AA: normal text contrast >=4.5:1 and large text >=3:1; keyboard navigation, visible focus, 200% zoom, content reflow and accessible filter state.
- Visual regression scenarios: light/dark 1440px desktop, 768px tablet and 390px mobile. Include 375px/430px variations for Hero, navigation and new walkthrough, plus Firefox/Chromium where browser runner is available.
- Maintain static WebP with declared intrinsic dimensions and existing self-hosted Inter; avoid runtime external CDN scripts.

## Verification after deployment

1. Confirm `https://kaori.cloud/robots.txt`, `/sitemap.xml`, public OG image path and homepage source metadata from an **unauthenticated** client.
2. Use a live social crawler/debugger to confirm image previews. Some crawlers prefer 1200 × 630 and have cache delay; do not claim that previews work until observed.
3. Collect actual Lighthouse/axe/Playwright evidence. No field-data percentile, browser screenshot PASS, accessibility PASS or performance score may be inferred from markup.
4. Attach exact source SHA, signed image digest, public edge checks and human feedback to homepage #3. Keep `main` promotion on hold pending acceptance.
