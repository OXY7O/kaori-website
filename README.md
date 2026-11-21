<p align="center">
  <img src="public/branding/kaori-logo.svg" alt="KAORI" width="112" />
</p>

<h1 align="center">KAORI Website</h1>
<p align="center"><strong>Meet KAORI. Operate with Clarity.</strong></p>
<p align="center">Discover a more connected way to understand infrastructure operations.</p>

<p align="center">
  <a href="https://kaori.cloud">Explore the Website</a> ·
  <a href="https://docs.kaori.cloud/">Documentation</a> ·
  <a href="https://app.kaori.cloud">Open Application</a>
</p>

## What is KAORI?

Infrastructure operations span many tools. Workloads, storage, monitoring, and source control each provide part of the picture, making it difficult to see the broader operational context.

**KAORI connects context, recorded evidence, and governed workflows across those systems.** It helps teams understand relationships, coordinate operational work, and make decisions with traceable information—without replacing the tools they already trust.

This repository contains the **public KAORI Website**, an introduction to the platform. The website itself is not the authenticated KAORI Application or a live infrastructure dashboard.

## What you'll discover

- **Infrastructure visibility:** See how KAORI brings operational assets and their relationships into context.
- **Connected operations:** Learn how information from different tools can support a more complete view.
- **Governed workflows:** Explore how authorization, evidence, and auditability inform operational actions.
- **The KAORI ecosystem:** Get to know the platform's approach to integrations and source authority.

Visit [kaori.cloud](https://kaori.cloud) for the experience, [app.kaori.cloud](https://app.kaori.cloud) for the separate authenticated application, and [KAORI Docs](https://docs.kaori.cloud/) for documentation maintained independently of this website.

## Run the website locally

The website is built with **Astro, TypeScript, and Tailwind CSS**, following KAORI's Violet visual design. It serves static content and does not connect directly to infrastructure providers or store application credentials.

For a ready-to-use development environment, open the project in VS Code and select **Dev Containers: Reopen in Container**.

Alternatively, use **Node.js 22** and **npm 10**:

```bash
npm ci
npm run dev
```

Then open [http://localhost:4321](http://localhost:4321). See the [development guide](docs/DEVELOPMENT.md) for setup and troubleshooting.

## Feedback and contributions

Have an idea or noticed a problem with the website? Share a non-security report in [Website Issues](https://github.com/OXY7O/kaori-website/issues). Proposals are reviewed by the maintainers; submitting one does not mean it is automatically accepted.

For code proposals or controlled fork testing, follow the [contributor walkthrough](docs/DEVELOPMENT.md#external-fork-prs--controlled-pre-launch-procedure) and [OXY7O contributing guidance](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md). These guides explain the review process and current contribution boundaries.

For a potential security vulnerability, use [private vulnerability reporting](https://github.com/OXY7O/kaori-website/security/advisories/new) rather than a public issue. If that option is unavailable, see the [security reporting guidance](https://github.com/OXY7O/.github/blob/main/SECURITY.md).

## License and project resources

KAORI-authored website **software source** is available under the [Apache License 2.0](LICENSE). KAORI names, logos, and brand artwork are not included in that software license; third-party assets retain their own licenses. See [NOTICE](NOTICE) for the applicable distinctions and attribution.

For more details, explore the [website architecture](docs/ARCHITECTURE.md), [CI/CD guidance](docs/CI_CD.md), [release and delivery process](docs/DELIVERY.md), and [deployment guide](docs/DEPLOYMENT.md). Browse [GitHub Releases](https://github.com/OXY7O/kaori-website/releases/latest) for the latest stable website release.
