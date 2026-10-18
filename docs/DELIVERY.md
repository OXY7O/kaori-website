# Governed website delivery

Follows the KAORI application delivery model, adapted to a static Astro site.

1. Create an Issue; use the native Issue Type and canonical KAORI taxonomy.
2. Create issue-linked branch from `kaori/staging`. Never implement features on `main`.
3. Draft PR to `kaori/staging`, run targeted Developer Check on exact work SHA.
4. Review, approve and merge using traceable merge commit.
5. Run Full Admission on exact staging SHA (Astro typecheck, formatter, npm security audit, build and Docker Runtime Admission). Browser accessibility/visual evidence is a separate release verification requirement, not a CI claim.
6. Build/publish one immutable OCI image; retain exact SHA, digest, SBOM and security scan evidence.
7. Deploy the candidate independently to the website release runtime; collect light/dark/mobile visual acceptance.
8. Promote only through `kaori/staging` → `main` PR. Preserve the accepted image digest.
9. Record post-promotion verification, release metadata and rollback reference.

Do not import irrelevant Flask/PostgreSQL/Celery checks or weaken required security and browser gates. Use path-aware work-branch checks to avoid expensive full-build/deploy cycles for copy edits while preserving the staging admission boundary.

The GitHub Project **KAORI Website** tracks work using the existing KAORI Status, Type, Priority, Story Point, Sprint and relationship taxonomy. Project custom fields and native parent/child association must be set through GitHub UI if connector actions do not expose them.

## Runner and implementation parity

CI runner labels and branch authority are documented in [`CI_CD.md`](CI_CD.md). `platform-ci` handles Developer Check, `kaori-ci` handles Full Admission. Reuse requires access granted to the website repository; runner labels do not override repository registration scope. Reference KAORI's existing workflows rather than introducing a parallel taxonomy.

## Current canonical automation surface

See [CI/CD workflow inventory](CI_CD.md#canonical-release-workflows). Single-use release activation and private ingress repair workflows were retired after their operational evidence was collected. Do not reintroduce their hardcoded RC.1 staging triggers. With GitHub Free/private and `main` still unpromoted, a new approved staging-only execution adapter requires a separate issue and review until normal manual dispatch is available; release security, Full Admission, release verification and human acceptance stay intact.

The approved domains are `https://kaori.cloud` (website) and `https://app.kaori.cloud` (application). Publishing website DNS/TLS requires the separate shared-edge runbook and operational review; no website workflow may overwrite application/public edge authority implicitly.

## Public RC.8 benchmark UAT handoff (2026-10-18)

- Authority: [storytelling #51](https://github.com/OXY7O/kaori-website/issues/51), [discovery #52](https://github.com/OXY7O/kaori-website/issues/52), [publication #56](https://github.com/OXY7O/kaori-website/issues/56), homepage acceptance [#3](https://github.com/OXY7O/kaori-website/issues/3).
- Exact staging release source: `dc5b76014971388054870dfffd671e09e73b450d`.
- Immutable prerelease: [v0.1.0-rc.8](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.8), digest `sha256:c0bf750fa0ef3627dbe9750e7b996c68fc7bcaa5b043fc4bd8ed34081a8ebef5`.
- [Same-SHA Full Admission / Docker Runtime Admission](https://github.com/OXY7O/kaori-website/actions/runs/39110431248): PASS.
- [Signed candidate build, scan, provenance and VPS/public-edge deployment](https://github.com/OXY7O/kaori-website/actions/runs/39110431291): PASS after fail-closed bounded admission wait and same-SHA retry. Existing `kaori.cloud`, `app.kaori.cloud`, `auto.kaori.cloud` health assertions are checked by the approved deployment script.
- The one-time publication adapter was removed from staging following successful execution; canonical quality and runtime workflows remain authoritative. Cleanup admission must be recorded separately; it does not create or redeploy another RC image.
- **Pending:** independent research-browser retrieval was unavailable; real desktop/mobile light/dark screenshots, keyboard/accessibility, metadata crawler preview and performance measurements require separate evidence and maintainer Human Acceptance under #3/#58. Do not promote staging to main.
- Rollback authority: prior signed immutable [RC.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7).

## Public RC.9 Violet editorial copy UAT handoff (2026-10-18)

- Authority: [copy refinement #60](https://github.com/OXY7O/kaori-website/issues/60), [signed release #62](https://github.com/OXY7O/kaori-website/issues/62), parent homepage Human Acceptance [#3](https://github.com/OXY7O/kaori-website/issues/3).
- Exact release source SHA: `b7d98e4cbda6c221a0d67a34db6bc0414ceecd21`.
- Signed immutable prerelease: [v0.1.0-rc.9](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.9), image digest `sha256:ab3bc078fa57f2b9e63476b431d54438198490328cff27a510d123ccf23d10d1`.
- [Same-SHA Full Admission / Docker Runtime Admission](https://github.com/OXY7O/kaori-website/actions/runs/39113263241): PASS.
- [Release signing, Trivy scan, provenance, SBOM and pinned SSH/public edge verification](https://github.com/OXY7O/kaori-website/actions/runs/39113263313): PASS after bounded retries. The first release verifier timed out waiting for Full Admission and failed closed; its retry published the immutable candidate. The first deployment attempt rejected an unhealthy candidate, **automatically recovered the previous RC.8 digest with its release receipt unchanged**, and failed closed. The single controlled failed-job retry successfully deployed the **same signed RC.9 digest** and validated existing public edge/application/n8n readiness. No release checks were bypassed.
- One-time publication adapter is removed through a reviewed cleanup workstream. Cleanup admission is independent; it must **not** publish a second RC.
- Human Visual Acceptance is still pending: desktop and mobile copy wrapping, Violet contrast in light/dark mode, editorial quote appearance, keyboard, zoom/reflow and cross-browser accessibility. Browser automation follows [#58](https://github.com/OXY7O/kaori-website/issues/58); automatic checks are not proof of screenshot/visual acceptance.
- Rollback: prior signed immutable [RC.8](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.8).
