<p align="center">
  <img src="public/branding/kaori-logo.svg" alt="KAORI" width="112" />
</p>

<h1 align="center">KAORI Website</h1>
<p align="center"><strong>Knowledge, Automation, Operations, Resilience & Intelligence</strong></p>
<p align="center">Meet KAORI. Explore the platform, then open the app.</p>

<p align="center">
  <img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-7C3AED" />
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4" />
  <a href="https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0">
    <img alt="KAORI Website stable release v0.1.0" src="https://img.shields.io/badge/Release-v0.1.0-7C3AED" />
  </a>
</p>

**KAORI Website** is the public introduction to the KAORI platform at [kaori.cloud](https://kaori.cloud). It presents the platform experience, its core capabilities, and a clear path to the authenticated application at [app.kaori.cloud](https://app.kaori.cloud).

This repository contains the **website only**: a static Astro frontend with no application authentication, operational database, or live infrastructure provider connections. Product capabilities and roadmap details belong to the KAORI Application's approved product documentation, not to this repository.

## Technology and project structure

The website uses **Astro 7, TypeScript 5, Tailwind CSS 4, and Inter**, with the KAORI Violet design language. Static output is served from a dedicated unprivileged container through the existing shared-edge HTTPS entry point.

- `src/pages/` — public pages and content.
- `src/components/` — header, footer, icons, and reusable page sections.
- `src/layouts/` and `src/styles/` — page structure, responsive styling, and light/dark themes.
- `public/branding/` — active KAORI logo and KAORI-directed AI-assisted Hero illustration assets.
- `docs/` — development, design, delivery, and deployment reference.
- `deploy/server/` — standalone static website container configuration.

Brand assets and visual conventions follow the KAORI Application. Use the approved logo, Violet tokens, Inter typography, and Lucide-style icons rather than creating a separate website design system. See [homepage review guidelines](docs/HOMEPAGE_REVIEW.md). The legacy operations-fabric illustration was retired from this Website because the current frontend no longer uses it; the KAORI Application is unaffected. The origin of the active AI-assisted Hero artwork and logo is recorded in that review, but ownership, trademark scope, AI-service terms, third-party attribution, and any source-code license grant remain subject to the [KAORI public-source rights audit](https://github.com/OXY7O/KAORI/issues/4212).

## Get started

**Recommended:** open this repository in VS Code and select **Dev Containers: Reopen in Container**. The container installs dependencies from the committed lockfile.

Alternatively, with **Node.js 22** and **npm 10** installed:

```bash
npm ci
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). For container setup and troubleshooting, see [development instructions](docs/DEVELOPMENT.md).

## Quality checks

Run the existing checks before submitting a PR:

```bash
npm run check-format
npm run check
npm run build
```

Changes follow an issue-linked branch and reviewed PR into `kaori/staging`. Developer Check and Full Admission provide source/build verification; signed release candidates, deployment verification, browser QA, and human acceptance remain separate gates. No direct changes to `main`.

See [CI/CD](docs/CI_CD.md), [delivery workflow](docs/DELIVERY.md), and [deployment and rollback](docs/DEPLOYMENT.md) for procedures and evidence requirements. The release badge identifies the accepted **stable GitHub Release**. Version `v0.1.0` reuses the already signed RC.10 OCI digest without rebuilding or retagging. See the [changelog](CHANGELOG.md) and [release notes](docs/releases/v0.1.0.md).

## Documentation

- [Website architecture and responsibilities](docs/ARCHITECTURE.md)
- [Development and DevContainer](docs/DEVELOPMENT.md)
- [Homepage design review](docs/HOMEPAGE_REVIEW.md)
- [CI/CD and quality gates](docs/CI_CD.md)
- [Release and delivery governance](docs/DELIVERY.md)
- [Deployment, verification, and rollback](docs/DEPLOYMENT.md)

## Community pull requests

**Start here:** [External fork walkthrough and merge-conflict recovery](docs/DEVELOPMENT.md#external-fork-prs--controlled-pre-launch-procedure). This repository is public, but **external contributor launch and relicensing remain on hold** until the [KAORI rights audit](https://github.com/OXY7O/KAORI/issues/4212) and [community approval](https://github.com/OXY7O/KAORI/issues/4217) are accepted. These instructions currently support maintainer-authorized testing and proposal review; visibility does not grant rights to redistribute KAORI code or branding.

For an approved test/proposal: **fork the repository → fetch `OXY7O/kaori-website:kaori/staging` as `upstream` → create a new branch from `upstream/kaori/staging` (not your fork's `main`) → make one scoped change → open a PR with base `OXY7O:kaori/staging` and head `YOUR_FORK:YOUR_BRANCH`.** Avoid reusing a fork branch that contains old `main` commits: that can cause conflicts even for a one-line README edit. See the linked guide for exact Git commands and the GitHub PR picker.

External fork PRs receive **feedback-only** `Community Fork Check` on an ephemeral GitHub-hosted runner with read-only permissions, no shared cache, deployment secrets or internal host access. Their trusted `Developer Check` intentionally rejects a foreign source **before checkout**; first-time contributors may also require a maintainer's safe workflow approval. A green community check is **not** trusted staging admission, UAT, license approval, or release authority. Maintainers first triage accepted work into an issue-linked trusted branch, then follow [CI/CD governance](docs/CI_CD.md) and the [KAORI delivery workflow](docs/DELIVERY.md).

## Security and ownership

This is a public repository for KAORI Website development. Do not commit credentials, private endpoints, internal infrastructure data, or screenshots containing operational information. Security and product policy remain governed by the approved KAORI standards.

For **non-security Website defects or feedback**, use the [Website issue tracker](https://github.com/OXY7O/kaori-website/issues) and its existing issue forms. Search for duplicates and provide sanitized reproduction evidence. This public channel is not a promise of immediate support or automatic acceptance into KAORI delivery.

To **report a Website vulnerability**, use [GitHub's private vulnerability reporting form for this repository](https://github.com/OXY7O/kaori-website/security/advisories/new); this repository's private reporting capability was verified enabled on 2026-11-08. Do **not** publish vulnerability details in a public issue, discussion, pull request, or email thread. If that private form is unavailable, consult the [organization security routing guidance](https://github.com/OXY7O/.github/blob/main/SECURITY.md) and contact authorized maintainers through a confirmed confidential route. Reports for the KAORI Application or Docs belong to their own repositories and private channels.

The shared [OXY7O contributing policy](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md) is the organization fallback; local repository policy and the accepted issue → review → staging/UAT → promotion workflow take precedence. Public visibility is not an open-source license grant while the separately governed rights audit remains pending.
