# KAORI Website

**Meet KAORI. Operate with Clarity.**

The public introduction to **KAORI — Knowledge, Automation, Operations, Resilience & Intelligence**, an infrastructure operations platform focused on bringing context, committed evidence, and governed workflows together without replacing the systems that already run your infrastructure.

[Explore KAORI](https://kaori.cloud) · [Open Application](https://app.kaori.cloud) · [Documentation](https://docs.kaori.cloud/) · [Source repository](https://github.com/OXY7O/kaori-website) · [Releases](https://github.com/OXY7O/kaori-website/releases)

**Infrastructure Operations** · **Evidence-Driven** · **Governed Workflows**

---

## What is KAORI?

Infrastructure operations often span multiple platforms, providers, and teams. Inventory, monitoring, automation, source control, and audit evidence can be scattered across separate systems.

**KAORI helps connect those perspectives.** It provides a common operational context for understanding infrastructure relationships, interpreting evidence, coordinating selected workflows, and supporting accountable decisions.

KAORI follows a fundamental principle: **external systems remain authoritative**. It does not aim to clone your Kubernetes cluster, monitoring stack, registry, or automation engine; its role is to connect and govern the context around them.

### The product experience

- **Infrastructure visibility** — understand assets, inventory, dependencies, and operational relationships.
- **Operational workflows** — coordinate selected actions through authorization, validation, and evidence.
- **Analytics and intelligence** — relate historical context and operational signals to support decisions.
- **Governance and audit** — make responsibilities, change history, and decisions traceable.

These describe the capabilities and operating model presented on the public Website. Exact availability, supported providers, and deployment readiness depend on the approved KAORI Application release and documentation.

## How KAORI approaches operations

1. **Observe the sources.** Infrastructure and external providers supply their own authoritative data.
2. **Relate the context.** KAORI normalizes and correlates relevant infrastructure information and committed evidence across domains.
3. **Coordinate governed work.** Selected workflows follow explicit authorization, validation, and operational boundaries.
4. **Preserve accountability.** Committed evidence and audit history support review, recovery, and learning.

**The result:** a clearer path from operational information to an evidence-backed decision, without transferring ownership away from existing systems.

## About this Docker image

This repository distributes **KAORI Website**, the public-facing product website at [kaori.cloud](https://kaori.cloud). It introduces the platform and provides links to the authenticated application and documentation.

**What the Website provides**

- A product introduction, operating principles, and platform capability overview.
- Explanations of KAORI's connected ecosystem and external-authority model.
- Navigation to the [separate KAORI Application](https://app.kaori.cloud) and project resources.

**What it does not provide**

- The authenticated KAORI Application, operational dashboards, or an API gateway.
- A database, Redis service, or direct live connections to infrastructure providers.
- Permission to execute infrastructure changes or replace release governance.

### Container profile

- **Image repository:** `lethisaputri/kaori-website`
- **Application type:** prebuilt static public website
- **Serving runtime:** unprivileged NGINX
- **Internal HTTP:** port `8080`; health endpoint `/healthz`
- **Public HTTPS:** managed by a separately governed shared edge, not by this image
- **Deployment:** the approved KAORI Website Compose/release adapter, not an ad hoc public container run

The runtime is deliberately isolated from the KAORI Application's authentication, data stores, and provider integrations.

## Getting the right image

Choose an **accepted release** from [KAORI Website releases](https://github.com/OXY7O/kaori-website/releases). Use its verified, immutable manifest digest rather than guessing a tag.

```bash
docker pull lethisaputri/kaori-website@sha256:<approved-digest>
```

Replace `<approved-digest>` with the complete SHA-256 manifest digest documented for the approved release. This is an image-selection example, **not** a complete deployment command.

### Release and version policy

- **`vX.Y.Z-rc.N`** — release candidate intended for controlled verification and UAT.
- **`vX.Y.Z`** — stable release after the required review, acceptance, and promotion.
- **`@sha256:<digest>`** — immutable identity used for deployment and rollback.
- **`latest`** — not the approved production release-selection contract.

**Build once. Verify the digest. Promote without rebuilding.** A published Docker Hub image alone does not prove its security evidence, staging acceptance, or production approval.

For installation, operational verification, and rollback, follow the [official Website deployment procedure](https://github.com/OXY7O/kaori-website/blob/main/docs/DEPLOYMENT.md). Avoid binding the image directly to public host ports or changing the shared HTTPS edge outside the approved workflow.

## Security and supply-chain boundaries

- Do not place credentials, private endpoints, or operational records inside public Website assets.
- Evaluate scanning, SBOM, provenance, and signing evidence against the **specific accepted digest**; do not infer those properties merely from a registry tag.
- Keep the static Website, authenticated KAORI Application, deployment credentials, and shared HTTPS edge separated.
- Use the established issue → reviewed branch/PR → staging admission → acceptance → promotion process for changes.

For a suspected Website vulnerability, use [private vulnerability reporting](https://github.com/OXY7O/kaori-website/security/advisories/new), not a public issue.

## Frequently asked questions

**Is this image the KAORI Application?**

No. This image serves the **public informational Website**. The authenticated operations platform is a separate application at [app.kaori.cloud](https://app.kaori.cloud).

**Can I use a `latest` tag or a random RC in production?**

No. Select the exact accepted release and its immutable digest. Review the release record and deployment procedure before changing any running instance.

**Does the Website connect to my Kubernetes, monitoring, or registry systems?**

No. It describes KAORI's platform capabilities; it does not contain live provider credentials, operational backend services, or an infrastructure-management API.

**Where should I report an issue?**

Use the [Website issue tracker](https://github.com/OXY7O/kaori-website/issues) for sanitized, non-security reports. Send sensitive vulnerability details through the [private security channel](https://github.com/OXY7O/kaori-website/security/advisories/new).

## Documentation and project links

- [KAORI Website](https://kaori.cloud) — explore the product and operating model.
- [KAORI Application](https://app.kaori.cloud) — open the separate authenticated platform.
- [Documentation](https://docs.kaori.cloud/) — documentation entry point.
- [Source code and engineering docs](https://github.com/OXY7O/kaori-website) — Website repository.
- [Releases and change history](https://github.com/OXY7O/kaori-website/releases) — accepted release records.
- [Deployment and rollback](https://github.com/OXY7O/kaori-website/blob/main/docs/DEPLOYMENT.md) — operator procedure.
- [Website issue tracker](https://github.com/OXY7O/kaori-website/issues) — non-security feedback.
- [Private security reporting](https://github.com/OXY7O/kaori-website/security/advisories/new) — confidential vulnerability intake.

## License, attribution, and brand

KAORI-authored Website **software source** is licensed under [Apache License 2.0](https://github.com/OXY7O/kaori-website/blob/main/LICENSE), subject to the [NOTICE](https://github.com/OXY7O/kaori-website/blob/main/NOTICE). KAORI/OXY7O names, trademarks, logos, brand artwork, and independently licensed third-party material are **not** covered by the software source license.

Public image availability does not grant rights to protected branding, access to a hosted service, or permission to publish private operational information.

---

**KAORI — Operate with Clarity.**
