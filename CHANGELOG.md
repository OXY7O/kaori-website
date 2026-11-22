# Changelog

User-facing changes to the public KAORI Website, listed by **published stable releases**. RC builds are staging candidates, not stable releases. For the full signed artifact, Human UAT and deployment evidence, follow the linked release notes.

## [0.1.3] — 2026-11-22

A clearer and more traceable public KAORI Website release, promoting the already signed and Human-Accepted `v0.1.3-rc.2` image without a rebuild or retag.

### Improved

- Friendly, human-reviewed stable release notes with a read-only GitHub draft and explicit technical evidence.
- Controlled contributor guidance and a concise three-badge, product-first README.
- Protected release governance: an explicit production request, separate independent Environment approval and retained signed artifact/UAT evidence.
- Operating documentation for the existing single-public-slot Website release model.

### Fixed

- Removed the invalid latest-stable badge query parameter; the README badge now follows GitHub's latest published stable version dynamically.
- Corrected the pre-promotion release-note draft generation and reconciled its configuration provenance documentation.

### Release identity

- [Published stable v0.1.3](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.3) from reviewed [promotion PR #273](https://github.com/OXY7O/kaori-website/pull/273), protected `main@5d23c015ba87b501467917ccdb4a723731a6edb3`.
- Signed and Human-Accepted candidate: [`v0.1.3-rc.2`](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.3-rc.2), source `fcb26c92036a15f1bb1d5625d23fe854a84a1a5c`.
- Immutable OCI digest: `sha256:9c54558c74a3ae9b95e01baff4341285e5fbbf6a9032f0f8b96464b717a93317`.
- [Protected production release #44986062743](https://github.com/OXY7O/kaori-website/actions/runs/44986062743) SUCCESS, signed digest and existing healthy runtime verified; no image rebuild or replacement.
- [Human UAT acceptance](https://github.com/OXY7O/kaori-website/issues/272#issuecomment-7074168346) and [human-friendly v0.1.3 notes](docs/releases/v0.1.3.md).

## [0.1.2] — 2026-11-21

A reliability-focused stable release of the public KAORI Website, promoting the previously accepted signed RC.11 build without rebuilding the application.

### Improved

- More reliable stable production publication and verification of the accepted Website image.
- Traceability from production release to the signed immutable RC digest, UAT evidence and deployed Website receipt.
- Separate production approval and verification preserved alongside the validated website experience.

### Fixed

- Resolved incompatible GitHub API curl flags that previously prevented the stable preflight from completing.

See [v0.1.2 release notes](docs/releases/v0.1.2.md) and [published stable v0.1.2](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2). The accepted source is `v0.1.2-rc.11` and the image digest is unchanged.

## [0.1.1] — 2026-10-19

Published stable release of the already accepted signed `v0.1.1-rc.3` image **without rebuilding**, after reviewed main promotion and protected release checks.

### Improved

- Mobile Hero and Architecture copy whitespace, capability card geometry, acronym wrapping and 390px CLS stability
- Compact responsive Ecosystem panel, usable one-row integration category filters and mobile full-width Product Experience CTA
- Desktop Product Experience authentication note and lock icon alignment
- Automated cross-theme, cross-viewport accessibility, geometry and browser-performance regression evidence
- Explicit guarded public shared-edge publication mode to avoid 502 caused by website container re-creation without `edge-public` attachment

### Release identity

- Signed candidate: [`v0.1.1-rc.3`](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.1-rc.3)
- Source: `f3260718ccb37a77738fa53f6ea6838863ab46a6`
- Signed immutable OCI digest: `sha256:4f0d1dbd583a7791978295388e29602d9c2c88ae12645fd7e22520a2b65e15c0`
- [Full Admission #67](https://github.com/OXY7O/kaori-website/actions/runs/39253519430) PASS (108/108 browser tests), [Candidate #5](https://github.com/OXY7O/kaori-website/actions/runs/39258412521) PASS, [Public deployment #3](https://github.com/OXY7O/kaori-website/actions/runs/39259512178) PASS
- Previously published `v0.1.0` remains part of the historical release and rollback record.

See [v0.1.1 release notes](docs/releases/v0.1.1.md) and [release authority #94](https://github.com/OXY7O/kaori-website/issues/94). This historical entry records the already-published stable version; it does not authorize any future release.

## [0.1.0] — 2026-10-18

First stable public website release. Promotes the accepted signed `v0.1.0-rc.10` image **without rebuilding**.

### Added

- Public KAORI branded landing page and responsive light/dark themes
- Cross-domain, evidence-led **How KAORI Works** product storytelling and example workflow
- Platform capabilities, illustrative integration discovery, architecture and conceptual product preview
- Public exploration, external application CTA and verified contact details
- Search/social metadata, robots policy and sitemap
- DevContainer, developer checks, signed candidate release evidence and documentation

### Improved

- Hero artwork and UI composition, accessibility-oriented contrast and responsive typography
- Concise editorial Violet quotes and card descriptions
- Domain-first integration browsing, clearer application handoff, and developer-focused README

### Release identity

The stable release references the existing signed OCI digest `sha256:8205ec3f66ed5c0eabc880f3fc49eb002da962b9c21242458c4ebc86a87dc930`. Human UAT was accepted; independently automated visual/accessibility/performance coverage remains open under #58.

Read the [full release notes](docs/releases/v0.1.0.md).
