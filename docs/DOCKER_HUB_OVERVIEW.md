# KAORI Website

**The public gateway to evidence-driven infrastructure operations.**

[Explore KAORI](https://kaori.cloud) · [Open Application](https://app.kaori.cloud) · [GitHub source](https://github.com/OXY7O/kaori-website)

![Astro 7](https://img.shields.io/badge/Astro-7-7C3AED)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Static website](https://img.shields.io/badge/Delivery-Static%20HTML-475569)
![NGINX](https://img.shields.io/badge/Runtime-Unprivileged%20NGINX-0F766E)

---

## Meet the KAORI platform

**KAORI Website** is the public-facing introduction to **KAORI — Knowledge, Automation, Operations, Resilience & Intelligence**. It explains how KAORI turns committed infrastructure evidence into a clearer operational picture while preserving the authority of external systems.

The website provides a concise journey from **discovering the platform** to **opening the authenticated application**. It does not display live infrastructure data or perform operational changes.

### Built for a focused experience

| Experience | Purpose |
| :--- | :--- |
| **Product introduction** | Communicate the KAORI mission and operating principles. |
| **Platform capabilities** | Explain infrastructure inventory, connected observability, correlation, intelligence and governance without promising unqualified features. |
| **Connected ecosystem** | Clarify that Kubernetes and external monitoring, registry and automation providers remain authoritative. |
| **Application entry point** | Direct authorized users to the separate KAORI Application. |

## Container profile

This is the **Website image**, not the KAORI Application image.

| | |
| :--- | :--- |
| **Repository** | `lethisaputri/kaori-website` |
| **Application** | Prebuilt static Astro frontend |
| **Runtime** | Unprivileged NGINX serving static files |
| **Internal HTTP** | Port `8080` with `/healthz` |
| **Authentication / data** | No application login, database, Redis or live provider connections |
| **Public site** | [kaori.cloud](https://kaori.cloud) via separately governed shared HTTPS edge |

The runtime is intentionally isolated from KAORI's authenticated application, data stores and provider integrations. Production deployment follows the approved Website Compose/release adapter rather than an ad hoc public `docker run`.

## Pull an approved image

Use the **exact immutable digest** from accepted release evidence:

```bash
docker pull lethisaputri/kaori-website@sha256:<approved-digest>
```

Replace `<approved-digest>` with the complete approved SHA-256 manifest digest. This is an identity illustration; it is not a ready-to-run deployment command.

| Reference | Meaning |
| :--- | :--- |
| `vX.Y.Z-rc.N` | Release candidate for governed validation and UAT. |
| `vX.Y.Z` | Stable release after the required acceptance and promotion. |
| `@sha256:<digest>` | Immutable deployment and rollback identity. |
| `latest` | Not an approved release-selection contract. |

**Build once, verify the digest, promote without rebuilding.** An image visible on Docker Hub is not by itself proof of staging or production acceptance.

## Project and release links

- [Website](https://kaori.cloud) — public product introduction
- [Application](https://app.kaori.cloud) — separate authenticated operations platform
- [Source repository](https://github.com/OXY7O/kaori-website) — implementation and source-level documentation
- [GitHub Releases](https://github.com/OXY7O/kaori-website/releases) — release tags and evidence
- [Deployment and rollback](https://github.com/OXY7O/kaori-website/blob/main/docs/DEPLOYMENT.md) — governed delivery procedure
- [Report a Website security issue privately](https://github.com/OXY7O/kaori-website/security/advisories/new)

## Security, licensing and brand

The container is a static public website, not an API gateway or a privileged operations component. Keep production credentials and private infrastructure data outside the image and public content. Verify scan, SBOM, signature and provenance evidence against the **specific accepted digest**.

Software licensing and third-party attributions follow the **exact source/release being used**; consult its repository license and notices. KAORI/OXY7O names, marks, approved logo and artwork remain separately protected; public image availability does not convey trademark rights or authorization to publish operational information.

---

**KAORI — Observe the context. Understand the evidence. Operate with confidence.**
