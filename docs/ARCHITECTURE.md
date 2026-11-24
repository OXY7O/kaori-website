# KAORI Website architecture

## Source of truth

The KAORI application repository owns product positioning, visual tokens, brand mark and capability status. Website content must cite the underlying approved state and must not silently turn future/planned features into available products.

## Runtime

Astro statically renders HTML/CSS/limited client JavaScript. The production deliverable is a Docker image serving static files through an unprivileged web server. It contains no application database, infrastructure credentials, auth provider, or direct access to Kubernetes/Prometheus/Harbor APIs.

## Immutable build and committed release status

The signed Astro/NGINX image contains immutable source SHA and RC build version but cannot know its later protected stable approval. The host owns a separate, read-only NGINX-served `/.well-known/kaori-website/{active,release}.json` projection: `active.json` is atomically committed after the checked image receipt; `release.json` is committed only after the externally authoritative stable GitHub Release succeeds and the running signed OCI digest is reverified. Normal visitors receive these same-origin public receipts (no GitHub API or registry credential fetch) and display stable only if active digest, source SHA and build tag match the signed build; otherwise they see an explicit unverified fallback. The original RC label remains visible. Rollback/new-candidate swaps invalidate stale stable status. The browser is not itself an OCI signature verifier; signing/attestation authority stays with external providers and the protected release workflow. The Website remains static and does not become a provider control plane.

## Visual contract

Reuse the existing KAORI Violet color, Inter typography, Lucide icon vocabulary, neutral-first dark mode and responsive accessibility conventions. This website may use richer editorial hero illustration, but not fictional production KPI, vulnerability/compliance claims, fabricated integration maturity or unauthenticated operational screenshots. The approved Option 3 concept is the homepage visual target for issue #3.

## Operational authority

KAORI normalizes, orchestrates, correlates and governs committed evidence while external providers remain authoritative. The public website only explains this contract; it is not another observability platform or a live operations console.

## Approved public domain boundary

- `https://kaori.cloud` — KAORI Website static informational landing page and canonical/OG origin.
- `https://app.kaori.cloud` — independent authenticated KAORI Application and destination of all **Open Application** CTAs.
- `https://docs.kaori.cloud` — independent KAORI Docs publication and public documentation destination; not part of the Website runtime or Application deployment.

The former `auto.kaori.cloud` automation service is **not** a current Website shared-edge readiness target. Historical automation/UAT observations belong to their original dated release evidence.

The application hostname migration is governed by `OXY7O/KAORI#2210`. Public apex publication is a separate shared-edge/DNS/TLS operation with explicit operator approval, checks and rollback. Private SSH-tunnel release verification is not evidence of public-domain acceptance.

## Public analytics

Umami is an independent, self-hosted provider at
`https://analytics.kaori.cloud` (KAORI #5190, #5191; consumer #301).
The Astro static build remains immutable; no application
credential, public Website ID, or enablement flag is embedded in the image.
The host-owned read-only `/.well-known/kaori-analytics/config.json` projection
is separate from release receipts and defaults to disabled when absent,
malformed, or explicitly off. Its schema requires the canonical HTTPS host,
exact provider script URL, UUIDv4, and explicit enablement.

The browser never loads the provider until the visitor explicitly allows
analytics using the footer privacy disclosure and the runtime config is valid.
DNT, Global Privacy Control, blocked storage and explicit opt-out fail closed.
Umami automatic pageview and click handling are disabled; the shared Astro layout sends one manual
pageview per pathname and bounded approved outbound CTA events without
preventing navigation. Query strings, fragments, referrer paths, custom
identities, event data, error/performance capture and session replay are
excluded. The loader sends only the canonical host, pathname, page title,
referring origin, language, screen dimensions and approved event name.
The provider processes network metadata; the authenticated application is
excluded. Local development and real CI traffic are excluded by exact
canonical origin; browser tests intercept all requests with local mocks.

No analytics provider failure may block rendering or navigation. Runtime
authorization is cached for at most 60 seconds in an open tab; expiry or
invalid config blocks sending until revalidated. Changing a Website ID
requires a fresh page load, not a rebuilt image.
