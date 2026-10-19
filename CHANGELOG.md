# Changelog

User-facing changes for KAORI Website. Release tags and immutable OCI digests remain the authoritative deployed artifact references.

## [0.1.1] — publication gated by issue #94

This release will promote the already signed `v0.1.1-rc.3` image **without rebuilding** only after full public mobile/desktop Human Acceptance, reviewed staging-to-main promotion and exact-main admission.

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
- Previous signed stable `v0.1.0` remains the fallback while promotion is pending.

See [v0.1.1 release notes](docs/releases/v0.1.1.md) and [release authority #94](https://github.com/OXY7O/kaori-website/issues/94). This document does not itself authorize the stable promotion marker.

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
