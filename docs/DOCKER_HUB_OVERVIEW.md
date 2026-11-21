# KAORI Website

**Meet KAORI. Operate with Clarity.**

Infrastructure operations are spread across systems, teams, and workflows. **KAORI — Knowledge, Automation, Operations, Resilience & Intelligence** connects operational context and committed evidence, helping teams understand infrastructure relationships, make informed decisions, and coordinate governed work while their existing tools remain authoritative.

[Explore KAORI](https://kaori.cloud) · [Open Application](https://app.kaori.cloud) · [Documentation](https://docs.kaori.cloud/) · [Source code](https://github.com/OXY7O/kaori-website)

![Infrastructure Operations](https://img.shields.io/badge/Focus-Infrastructure%20Operations-7C3AED)
![Evidence-Driven](https://img.shields.io/badge/Principle-Evidence--Driven-475569)
![Governed Workflows](https://img.shields.io/badge/Approach-Governed%20Workflows-0F766E)

---

## Why KAORI

**Operate with context, not isolated tools.** KAORI brings related infrastructure information and committed evidence into a more coherent operational picture. Its product direction centers on four connected experiences:

- **Infrastructure visibility** — understand assets, inventory, dependencies, and relationships.
- **Operational workflows** — coordinate selected actions with authorization, validation, and evidence.
- **Analytics and intelligence** — relate operational signals and historical context to support decisions.
- **Governance and audit** — make change history, accountability, and operational responsibility traceable.

These are the platform capabilities presented by the public Website; individual feature availability and deployment requirements are governed by the KAORI Application.

## How it works

**External systems stay authoritative. KAORI connects the operational context.**

1. **Observe** infrastructure context from existing systems.
2. **Relate** signals, assets, and committed evidence across domains.
3. **Act with governance** through controlled workflows, validation, and auditability.

KAORI is not a replacement for Kubernetes, monitoring, registries, source control, or automation engines. It adds the cross-domain context and operational coordination that isolated tools cannot provide alone.

## What this image delivers

This Docker Hub repository distributes the **public KAORI Website** — the product introduction at [kaori.cloud](https://kaori.cloud), **not** the authenticated KAORI Application.

- **For visitors:** discover the KAORI vision, operating principles, capabilities, and connected ecosystem.
- **For operators:** deploy the public informational website through the approved Website release and Compose procedure.
- **Runtime boundary:** static website served by unprivileged NGINX on internal HTTP port `8080` with `/healthz`; no application login, database, or live infrastructure provider connections.

To use the operational product, follow [Open Application](https://app.kaori.cloud). The Website image cannot perform infrastructure mutations.

## Images and release guidance

Select a release from [KAORI Website releases](https://github.com/OXY7O/kaori-website/releases) and use its **approved immutable image digest**:

```bash
docker pull lethisaputri/kaori-website@sha256:<approved-digest>
```

Replace `<approved-digest>` with the complete SHA-256 digest from accepted release evidence. This pull example is **not** a standalone production deployment procedure.

- `vX.Y.Z-rc.N` — release candidate for controlled validation and UAT.
- `vX.Y.Z` — stable release following the required acceptance and promotion.
- `@sha256:<digest>` — immutable deployment and rollback identity.
- `latest` — not the approved release-selection contract.

**Build once. Verify the digest. Promote without rebuilding.** Use the governed [deployment and rollback procedure](https://github.com/OXY7O/kaori-website/blob/main/docs/DEPLOYMENT.md), not an ad hoc public `docker run`.

## Explore and get support

- [KAORI public website](https://kaori.cloud) — product introduction and navigation.
- [KAORI Application](https://app.kaori.cloud) — separate authenticated operations platform.
- [Documentation](https://docs.kaori.cloud/) — documentation entry point.
- [GitHub source](https://github.com/OXY7O/kaori-website) — Website implementation and engineering documentation.
- [Releases](https://github.com/OXY7O/kaori-website/releases) — version and release evidence.
- [Report a Website issue](https://github.com/OXY7O/kaori-website/issues) — public, sanitized defect reports.
- [Report a security vulnerability privately](https://github.com/OXY7O/kaori-website/security/advisories/new) — confidential vulnerability reporting.

## Security, rights, and attribution

The Website is an informational frontend, not an operations API or an infrastructure integration. Do not put credentials or private infrastructure information in public content. Verify any image security claims against the **exact accepted digest**.

KAORI-authored Website **source code** is licensed under [Apache-2.0](https://github.com/OXY7O/kaori-website/blob/main/LICENSE), subject to its [NOTICE](https://github.com/OXY7O/kaori-website/blob/main/NOTICE). KAORI/OXY7O names, logos, artwork, and separately licensed third-party materials are not covered by that software grant. Public image availability is not permission to reuse protected brand assets or disclose operational information.

---

**KAORI — Operate with Clarity.**
