# KAORI Website architecture

## Source of truth

The KAORI application repository owns product positioning, visual tokens, brand mark and capability status. Website content must cite the underlying approved state and must not silently turn future/planned features into available products.

## Runtime

Astro statically renders HTML/CSS/limited client JavaScript. The production deliverable is a Docker image serving static files through an unprivileged web server. It contains no application database, infrastructure credentials, auth provider, or direct access to Kubernetes/Prometheus/Harbor APIs.

## Visual contract

Reuse the existing KAORI Violet color, Inter typography, Lucide icon vocabulary, neutral-first dark mode and responsive accessibility conventions. This website may use richer editorial hero illustration, but not fictional production KPI, vulnerability/compliance claims, fabricated integration maturity or unauthenticated operational screenshots. The approved Option 3 concept is the homepage visual target for issue #3.

## Operational authority

KAORI normalizes, orchestrates, correlates and governs committed evidence while external providers remain authoritative. The public website only explains this contract; it is not another observability platform or a live operations console.

## Approved public domain boundary

- `https://kaori.cloud` — KAORI Website static informational landing page and canonical/OG origin.
- `https://app.kaori.cloud` — independent authenticated KAORI Application and destination of all **Open Application** CTAs.
- `https://auto.kaori.cloud` — separate automation publication; not part of website or application migration.

The application hostname migration is governed by `OXY7O/KAORI#2210`. Public apex publication is a separate shared-edge/DNS/TLS operation with explicit operator approval, checks and rollback. Private SSH-tunnel release verification is not evidence of public-domain acceptance.
