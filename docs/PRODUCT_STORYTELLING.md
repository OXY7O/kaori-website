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
