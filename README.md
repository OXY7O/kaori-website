<p align="center">
  <img src="public/branding/kaori-logo.svg" alt="KAORI official logo" width="112" />
</p>

<h1 align="center">KAORI Website</h1>
<p align="center"><strong>Knowledge · Automation · Operations · Resilience · Intelligence</strong></p>
<p align="center">From infrastructure to insight. The public-facing home of KAORI.</p>

<p align="center">
  <img alt="Astro" src="https://img.shields.io/badge/Astro-static-7C3AED" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-typed-3178C6" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4" />
  <img alt="License" src="https://img.shields.io/badge/License-internal%20use-64748B" />
</p>

**KAORI Website** is the public, static product overview for KAORI's infrastructure operations platform. It explains capability domains, evidence-first operations and integration boundaries without exposing the authenticated application, live data, private infrastructure, provider tokens or internal metrics.

> **Evidence first. Provider authority preserved.** KAORI normalizes, correlates, orchestrates and governs infrastructure operations. External systems remain authoritative.

## Website and Application

| Surface | Address | Responsibility |
| --- | --- | --- |
| KAORI Website | [kaori.cloud](https://kaori.cloud) | Public informational website and product introduction |
| KAORI Application | [app.kaori.cloud](https://app.kaori.cloud) | Authenticated infrastructure operations workspace |
| Automation service | `auto.kaori.cloud` | Independent n8n service; not owned by this website |

The website runs in the dedicated `kaori-website` Docker Compose project and uses the existing shared-edge Nginx/Certbot runtime. It does **not** own HTTPS ingress, the KAORI Application database, authentication, workers or n8n.

## Product Architecture

```text
      External infrastructure tools (remain authoritative)
      Kubernetes · S3-compatible storage · GitHub · Harbor
                       Prometheus · Alertmanager
                               |
                               v
                      KAORI capability domains
                 Normalization · Evidence · Correlation
                    Orchestration · Governance
                               |
                               v
             Visibility · Workflows · Intelligence · Audit
```

Provider names are illustrative ecosystem examples, **not** claims that every provider integration is currently available. The preview and network artwork are illustrative and contain no live infrastructure or fabricated performance metrics.

## Visual System

The website shares the official KAORI SVG mark and the app's **Inter, KAORI Violet, Lucide-style outline iconography** and operations-fabric artwork, while retaining the approved editorial public-homepage composition. It supports light and dark modes, mobile navigation, keyboard focus and reduced motion.

The authoritative product and UI contracts live in the private KAORI Application repository: `OXY7O/KAORI/docs/product/README.md`, `docs/design/KAORI_DESIGN_SYSTEM.md` and `docs/design/components/DARK_MODE.md`. Website-specific visual review lives in [`docs/HOMEPAGE_REVIEW.md`](docs/HOMEPAGE_REVIEW.md). Do not fork those design-system authorities into a second competing standard.

## Quick Start

Recommended workflow: **VS Code → Dev Containers: Reopen in Container**. The project installs locked npm dependencies inside the development container.

For an existing Node 22 and npm 10 environment:

```bash
npm ci
npm run dev
# Open http://localhost:4321
```

## Quality and Verification

```bash
npm run check-format
npm run check
npm run build
```

GitHub Actions runs the issue-scoped Developer Check, exact-merge Full Admission, Docker Runtime Admission and release security verification. A successful static build does not replace actual browser desktop/tablet/mobile, light/dark, accessibility or human acceptance evidence.

## Deployment and Release

```text
Issue → Work Branch → Draft/Ready PR → Developer Check
→ kaori/staging → Full Admission + Docker Runtime Admission
→ Signed immutable RC (Trivy, SBOM, provenance, OCI digest)
→ Independent SSH host deployment → Public edge verification
→ Browser UAT → Human acceptance → Promotion PR → main
```

Release candidates are pinned to exact source SHAs and immutable image digests. The public website runs in a standalone container, while `/opt/shared-edge` owns HTTPS/TLS, Host/SNI checks and Certbot renewals. A new container deployment may require the existing edge-public reattachment procedure; do not replicate or independently mutate shared-edge scripts.

The published RC identity, rollback receipt and accepted browser evidence are recorded in the relevant GitHub Issue, GitHub Release and workflow run. No production/stable claim follows merely from publishing a prerelease.

## Documentation

| Area | Reference |
| --- | --- |
| Development | [Development guide](docs/DEVELOPMENT.md) |
| Architecture and design | [Architecture](docs/ARCHITECTURE.md) |
| Homepage visual review | [Homepage review contract](docs/HOMEPAGE_REVIEW.md) |
| Quality and CI/CD | [CI/CD gates](docs/CI_CD.md) |
| Delivery governance | [Delivery flow](docs/DELIVERY.md) |
| Server/edge release boundary | [Deployment and rollback](docs/DEPLOYMENT.md) |

## Ownership and Security

KAORI is an **internal-use proprietary project**, not an open-source distribution. Never publish application credentials, infrastructure addresses, private dashboards, test accounts or audit payloads in this website or its release artifacts. Work is governed by a GitHub Issue and reviewable staging PR; **no direct code changes to `main`**.
