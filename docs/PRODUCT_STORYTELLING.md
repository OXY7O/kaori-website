# Website Product Storytelling Contract

Authority: [KAORI Platform Direction](https://github.com/OXY7O/KAORI/blob/main/docs/product/README.md). Implementation workstream: [#51](https://github.com/OXY7O/kaori-website/issues/51), derived from [homepage review #3](https://github.com/OXY7O/kaori-website/issues/3).

## Public visitor journey

1. Hero introduces KAORI and links to the same-page **How KAORI Works** explanation without requiring application credentials.
2. Platform Capabilities explains the operational domains, not provider-specific products.
3. The four-step **Sources → Context → Evidence → Governance** sequence explains an operating approach, not a fixed synchronous execution pipeline.
4. A monitoring-alert example demonstrates the value of cross-domain context, followed by a conceptual product preview with its explicit illustration label.
5. **Open Application** remains an authenticated application destination; the footer provides the already-approved owner contact link.

## Truth and safety boundaries

- Integrated source engines stay authoritative; KAORI adds normalization, correlation, committed evidence and governed workflows.
- The illustrative scenario is **not** a claim that all connected sources and operations are deployed, actively integrated, or available to every tenant.
- No real telemetry, tenant identity, account credential, customer, SOC claim, adoption statistics or invented operational metrics appear on the public website.
- The existing product mockup is concept-only. Do not replace its label or call it a real screenshot. Publish sanitized actual application imagery only after verification under #53.

## Acceptance and verification

- Exact-head Developer Check: format, Astro/TypeScript, static build.
- Staging Full Admission and container runtime are separate from public deployment.
- Public UAT: light/dark across 390/768/1440px and 200% zoom, keyboard/tab/focus, filter behavior, headings, anchors and screen-reader meaning.
- Record browser evidence and human acceptance under #3. A successful HTTP status or automated CI does not establish visual approval.

## RC.8 visual feedback: editorial descriptions (#60)

The section and practical-scenario supporting descriptions use a semantic `blockquote` with a restrained Violet quote mark, left rule and key-phrase emphasis. Quote ornament is CSS-only; the text remains readable by assistive technology, and the CSS uses existing `--violet` and content tokens in both themes. Step cards contain concise, factual copy designed to avoid extra lines in the four-column desktop layout without fixed heights, forced line breaks or truncation. Line wrapping naturally adapts on narrower viewports and 200% zoom.

This is illustrative product storytelling, not a commitment that every provider/workflow integration is currently available. Acceptance requires actual desktop/tablet/mobile light/dark browser visual review under #3, not merely a successful build.

## One-line desktop editorial quotes (#65)

For the desktop How KAORI Works quote, use the concise statement “Evidence connects sources to governed decisions.” For the alert scenario, use “Signals reveal symptoms; context and evidence guide action.” Keep both as full semantic sentences with Violet accents via existing `strong` styling, preserve supporting text, and allow natural wrapping on mobile or at high zoom. Do not force `white-space: nowrap`, truncate copy, or replace existing shared typography components. Verify actual light/dark desktop rendering during human UAT under #3; a source-text change or static build does not prove one-line rendering at every viewport.
