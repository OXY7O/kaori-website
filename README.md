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
- `public/branding/` — approved KAORI logo and illustration assets.
- `docs/` — development, design, delivery, and deployment reference.
- `deploy/server/` — standalone static website container configuration.

Brand assets and visual conventions follow the KAORI Application. Use the approved logo, Violet tokens, Inter typography, and Lucide-style icons rather than creating a separate website design system. See [homepage review guidelines](docs/HOMEPAGE_REVIEW.md).

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

This repository is public. External fork pull requests targeting `kaori/staging` receive **feedback-only** checks through the separate `Community Fork Check` workflow on an ephemeral GitHub-hosted runner with a read-only token, no shared cache, no deployment secrets, and no access to internal hosts. The checks report exact-source whitespace, locked npm installation without lifecycle scripts, formatting, Astro/TypeScript and static build results.

Passing community feedback is **not** trusted Developer Check, staging Full Admission, UAT, or permission to publish/deploy. To adopt a contribution, a maintainer reviews it, creates or links an approved KAORI issue and trusted work branch, and uses the existing staged delivery flow. See [CI/CD governance](docs/CI_CD.md) and [KAORI contributor authority](https://github.com/OXY7O/KAORI).

## Security and ownership

This is a public repository for KAORI Website Development. Do not commit credentials, private endpoints, internal infrastructure data, or screenshots containing operational information. Security and product policy remain governed by the approved KAORI standards.

For **non-security Website defects or feedback**, use the [Website issue tracker](https://github.com/OXY7O/kaori-website/issues) and its existing issue forms. Search for duplicates and provide sanitized reproduction evidence. This public channel is not a promise of immediate support or automatic acceptance into KAORI delivery.

To **report a Website vulnerability**, use [GitHub's private vulnerability reporting form for this repository](https://github.com/OXY7O/kaori-website/security/advisories/new); this repository's private reporting capability was verified enabled on 2026-11-08. Do **not** publish vulnerability details in a public issue, discussion, pull request, or email thread. If that private form is unavailable, consult the [organization security routing guidance](https://github.com/OXY7O/.github/blob/main/SECURITY.md) and contact authorized maintainers through a confirmed confidential route. Reports for the KAORI Application or Docs belong to their own repositories and private channels.

The shared [OXY7O contributing policy](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md) is the organization fallback; local repository policy and the accepted issue → review → staging/UAT → promotion workflow take precedence. Public visibility is not an open-source license grant while the separately governed rights audit remains pending.
