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
2. Hero — From infrastructure to insight
3. Evidence-first / provider-authoritative operating principles
4. Platform capability domains
5. Technology ecosystem examples
6. External authority → KAORI → teams architecture
7. Clearly-marked conceptual product experience
8. CTA and footer

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

The maintainer approved full-section website mockups and required parity with the existing KAORI Application iconography and login visual language. This work retains the approved **editorial public website**: dark-violet hero and closing handoff; neutral-first content cards; four capability domains; six illustrative integration examples; capability-first architecture and explicitly conceptual product preview.

- Official logo: `public/branding/kaori-logo.svg` matches the application's canonical `app/static/images/kaori-logo.svg`.
- Official operations-fabric artwork: `public/branding/kaori-operations-fabric.svg` copied **unchanged** from application `app/static/images/kaori-login-operations-fabric.svg`, source of truth in `OXY7O/KAORI`.
- Iconography: semantic Lucide-style paths via `src/components/Icon.astro` with the same stroke vocabulary as the KAORI Application, never invented provider logo glyphs.
- Capability/technology cards and diagrams are editorial explanations, **not live operational widgets**. Never fabricate inventory counts, SLIs, security posture or integration status.
- All public application links target `https://app.kaori.cloud`; private application repository links are withheld from the public footer. Both light and dark modes retain the Violet/Inter family identity.

**Release checks still required:** 1366/1440 desktop, 768/1024 tablet, 375/390/430 mobile, keyboard navigation/focus and 200% zoom, no clipping, explicit concept text, real browser CTA tests, all three domain health checks, distinct signed source SHA/digest and human review. Successful code checks do not by themselves prove Visual QA or final acceptance.
