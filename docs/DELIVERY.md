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

## v0.1.1 publication preparation — issue #94

The signed and publicly deployed v0.1.1-rc.3 digest remains immutable. Its exact staging source has Full Admission #67, Container Admission and Browser Quality Evidence (108/108) PASS; Release Candidate #5 and guarded public Release Deployment #3 PASS. The maintainer confirmed the website opens and the specific desktop lock-icon defect is corrected. Full mobile light/dark Human Acceptance, Host/SNI and TLS/renewal security review are not inferred from successful origin-host HTTPS checks. The stable v0.1.1 publisher is specifically gated by the issue #94 main merge marker, accepted RC.3 identity, absent stable tag, preserved build inputs, and exact-main Full Admission/Container/Browser checks. Until Human Acceptance under #94, do not merge promotion PR or trigger the stable tag. Existing v0.1.0 remains stable rollback and no rebuild/registry retag is permitted.

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

## Public RC.10 single-line editorial copy UAT handoff (2026-10-18)

- Authority: [one-line copy #65](https://github.com/OXY7O/kaori-website/issues/65), [signed RC release #67](https://github.com/OXY7O/kaori-website/issues/67), homepage visual acceptance [#3](https://github.com/OXY7O/kaori-website/issues/3).
- Release staging source: `84fdd7f75c01de6ee49f6b5805424740e4518268`, [v0.1.0-rc.10](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.10).
- Immutable image digest: `sha256:8205ec3f66ed5c0eabc880f3fc49eb002da962b9c21242458c4ebc86a87dc930`, from successful signed Trivy/SPDX SBOM/provenance publisher.
- [Full Admission and Docker Runtime Admission on exact RC source SHA](https://github.com/OXY7O/kaori-website/actions/runs/39115027095): PASS.
- [Signed publisher and pinned SSH deployment/public-edge verification](https://github.com/OXY7O/kaori-website/actions/runs/39115027321): PASS. Initial verifier timed out pending exact-SHA Full Admission and failed closed; verifier retry after admission passed published RC.10. First deploy attempt failed candidate health and automatically restored signed RC.9 with release receipt unchanged. Single controlled same-digest deploy retry succeeded and verified existing public edge plus application/automation domain readiness. No security gate was bypassed.
- The consumed one-time publication workflow was removed by reviewed cleanup PR; canonical automation preserved. Cleanup admission must be verified separately and does not trigger another image release.
- **Pending:** independent desktop 1440px and theme-based screenshot review of both one-line statements, reflow/zoom on smaller viewports and human acceptance under #3. No Lighthouse, axe, or browser one-line measurement is claimed from static CI/HTTP checks.
- Rollback authority: previously signed immutable [RC.9](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.9). No promotion to `main` yet.

## Actions display nomenclature review — issue #23 (after stable v0.1.0)

Four canonical workflows retain their original filenames, job IDs, event triggers, dependency edges, runner labels and security controls. Their **display names** are Developer Check, Full Admission, Release Candidate, and Release Deployment. New workflow run labels show the PR/branch or candidate tag. Historical one-time RC workflow identities persist in the Actions sidebar because run evidence remains intact; deleting the retired YAML did not erase their run records. Do not delete historical runs for cosmetic reasons. The user-accepted stable [v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) is current; preceding RC.8/RC.9/RC.10 paragraphs above are **historical release handoff evidence**, not current TODOs or authorization to promote again. Check labels/consumers before updating any enforced required check settings. This text-and-metadata-only patch does not rebuild, sign, retag or redeploy the immutable website image.

## Website footer build identity and RC review — #121

The Website footer shows **Website build vX.Y.Z-rc.N** for an immutable signed release candidate, or **Website build development** for a local/CI Astro build without an admitted release identity. The build stage receives the *same* `APP_VERSION` argument used by `scripts/release/publish-candidate.sh` for the `org.opencontainers.image.version` label, not the stale `package.json` version. `Dockerfile` exposes it to Astro only during static compilation; the deployed container does not call GitHub on every page load and the existing immutable assets and HTML cache policy remain in force.

**Build identity is not the stable GitHub Release identity.** When a reviewed `vX.Y.Z-rc.N` is accepted and the *same* signed OCI digest is promoted to stable `vX.Y.Z` without rebuilding, its footer must continue to show the honest original RC **build** value. The stable release, its GitHub Release record, and host-side deployment receipt are distinct approval/evidence authorities. Generic recurring stable publishing, production auto-deployment, and a possible runtime stable-release presentation are governed separately by #119; do not mutate the served static files or image merely to replace the RC build string.

The existing `Release Candidate` manual workflow accepts a unique `vX.Y.Z-rc.N` and the exact admitted `kaori/staging` SHA and must pass Trivy, SBOM, SLSA/Cosign and digest verification. The existing `Release Deployment` workflow requires the signed RC, matching source, explicit approval reference and pinned SSH trust. Its private loopback deployment remains separate from the opt-in shared-public-edge attachment. **Do not expose a new RC at `kaori.cloud` or claim user-visible UAT until the maintainer explicitly approves that exact tag, SHA and digest, and the real browser/edge evidence is collected.** Container smoke now inspects the built HTML identity as well as the OCI labels.

Refs #117 and #121 share Website PR #120; no new release engine, branch trigger, automatic production deploy, or unapproved public cutover is created.
