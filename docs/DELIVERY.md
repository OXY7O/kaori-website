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

## KAORI Website reference release topology

**Approved operating contract (21 November 2026): two protected branches, two
GitHub governance Environments, and one active public Website runtime on the
current VM.** This deliberately shared slot is the reference delivery pattern
for KAORI Application and KAORI Docs, not a requirement that those products
reuse Website-specific implementation, host credentials, or public ingress.

- **Staging source:** Only issue-scoped reviewed changes enter protected
  `kaori/staging`. The exact integrated source must pass Full Admission before
  an intentional signed `vX.Y.Z-rc.N` release is published.
- **Staging runtime:** An authorized RC may replace the existing
  `kaori-website` container at `https://kaori.cloud`. The previously
  committed immutable digest/receipt remains the rollback authority.
  This RC is publicly visible **before** stable-production approval.
- **Human UAT:** Verify the deployed RC's SHA, digest, runtime/edge health,
  browser and accessibility behavior, and relevant security evidence.
  Record explicit release-bound acceptance; CI success is not Human UAT.
- **Production source:** Promote through an independently approved
  `kaori/staging → main` PR and the main-target admission. **Merging main is
  not a production release request.**
- **Explicit production release:** After signed RC Human Acceptance,
  independently reviewed source promotion and a reviewed human-friendly
  `docs/releases/vX.Y.Z.md` file, the maintainer requests `vX.Y.Z`
  through `release-production.yml` using **one stable-tag input**. GitHub
  derives the promotion PR from the reviewed file, validates exact main
  admission and trusted UAT, and requires the independent protected
  `production` Environment reviewer. Production verifies or reconciles the
  Human-Accepted signed RC's **exact OCI digest**; the public release notes
  lead with user impact, while immutable SHA/digest and deployment proof
  are appended in a separate Technical Evidence section. No rebuild or
  retag occurs; a healthy matching target is not redeployed.
- **Stale RC protection:** If a newer staging RC has displaced the accepted
  live digest, stable publication must fail closed until the correct artifact,
  acceptance, and runtime evidence are reconciled.
- **Activation:** Staging's `KAORI_WEBSITE_AUTO_STAGING_ENABLED` remains
  Environment-scoped and default-off. Production **has no push-triggered
  activation**: a main push never queues its reviewer or release job.
  The former `KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED` is retired from
  executable release authority. Only a valid explicit stable release dispatch
  with an independent production reviewer may proceed. No switch or reviewer
  alone replaces accepted signed evidence or Human UAT.

**Release notes policy:** Use GitHub's native `.github/release.yml`
categories for a **read-only draft**, then turn it into a concise, meaningful,
version-specific Markdown file reviewed through the same staging/main flow.
The stable publisher will refuse missing, placeholder or mismatched notes;
it never publishes machine-generated internal PR titles as the final story.
`CHANGELOG.md` lists **published stable versions only** and may be
synchronized by a follow-up reviewed documentation PR after publication.
See [release-note preparation](CI_CD.md#explicit-production-release-request--website-257).
An accepted RC or a green main CI run alone is never release permission.

GitHub `staging` and `production` are **logical governance/credential
scopes**, not statements that two servers already exist. They share the
current public Website slot and release/deploy concurrency boundary. The
accepted v0.1.2 stable release from v0.1.2-rc.11 demonstrates same-digest
promotion without a second production deployment.

**Future separate VM:** Keep the same branch, admission, RC, UAT, immutable
digest and explicit production release request contract. Per-Environment
host/SSH/project configuration selects independently approved targets. The
existing #239 release adapter can reconcile an accepted signed digest into a
prepared receipt-backed target, but it does **not** provision servers, configure
DNS/TLS, authorize a different provider edge or replace a missing rollback
baseline. Those operations require separate admission and live UAT. See
[Website #234](https://github.com/OXY7O/kaori-website/issues/234).
See [deployment boundaries](DEPLOYMENT.md#reference-host-topology-and-portability).

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

## Website footer build identity — #121

The footer reads `APP_VERSION` injected by the Dockerfile into the static Astro build.
The same argument supplies the OCI version label.
Local builds without a release identity display `development`.

After an RC is promoted to stable without rebuilding, the footer still shows
its original `vX.Y.Z-rc.N` **build** identity.
The stable GitHub Release and deployment receipt are separate authorities.
Do not rebuild or modify a signed digest merely to change the footer.

Existing Release Candidate and Release Deployment workflows require exact
admitted staging source, immutable signed images, security evidence and approval.
Private manual inspection and the approved request-branch public UAT are distinct;
the latter requires exact per-RC cutover authority, not merely an admitted build.
The historical #119 one-off stable flow was superseded by #203 for signed same-digest promotion; Website #257 now supersedes the #203 main-push _trigger_. No standing stable production activation is granted.

## Approved release-train transition — #201–#204

The target topology is two GitHub governance Environments on **one** public
`https://kaori.cloud` slot: admitted `kaori/staging` merges may automatically
publish/deploy signed RCs (which become public **before** production approval),
then a distinct Human UAT and reviewed `kaori/staging` → `main` promotion
precede an **explicit maintainer production release request**. Only that
release request reaches GitHub `production` reviewer approval and same-digest
stable metadata publication. The push-triggered production approval from the
older #201/#203 implementation is superseded by Website #257. Reviewed PR #205 and PR #206 have both **merged to protected `kaori/staging`**, while automatic RC publication/deploy and stable production activation remain on HOLD. Release rights, environment protection readback, host/rollback
verification and post-merge UAT are distinct acceptance gates. The prior
RC.9 Human UAT acceptance applies to RC.9 only. See
[CI/CD](CI_CD.md#admission-gated-automatic-public-staging--201--202) and
[Deployment](DEPLOYMENT.md#governed-stable-production-approval-using-the-existing-one-slot-runtime--203).

## Previous request-triggered Website RC and public UAT — #122 / #195

The accepted [#195](https://github.com/OXY7O/kaori-website/issues/195)
contract revises #122's **private-only** request-branch implementation:
`kaori/rc-request` still produces an admitted, source-pinned signed RC,
but `kaori/uat-request` now targets the **existing single public Website**
at `https://kaori.cloud` after **explicit release-specific approval**.
The request must match exact source SHA, signed prerelease tag, publisher,
merged staging PR, approval issue content and maintainer-controlled Actions
variables; missing/stale approval blocks before SSH. It reuses the current
public Compose/edge/rollback adapter. This is the **legacy separately approved
request path**, not a ban on the new #202 automatic staging proposal.
Release acceptance still requires actual Website/App/Docs public HTTPS
results and separate Human UAT.
The older private RC.8 [#194](https://github.com/OXY7O/kaori-website/issues/194)
remains historical evidence, not public cutover authority.

Always preserve the signed candidate's source SHA, immutable registry digest,
SBOM/provenance, release tag, successful publisher run, deployment receipt,
rollback authority and independent Human Acceptance. The footer's embedded
`Website build vX.Y.Z-rc.N` remains truthful after same-digest stable promotion;
it is not an asserted stable GitHub Release label. The old #119 one-time stable contract is historical; the updated #257 production workflow requires an **explicit release request on main**, a protected `production` Environment reviewer, and the same accepted signed digest without rebuild. Neither source PR review nor main merge is release permission; the exact release request, rights and environment protection must be independently verified.

For the exact request commands, manual fallback and failure handling, see
[CI/CD](CI_CD.md). KAORI release request policy is coordinated by
[KAORI #4201](https://github.com/OXY7O/KAORI/issues/4201).

## Independent Website UAT runtime — #124

[Signed Website v0.1.2-rc.1](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2-rc.1)
was successfully published from admitted staging
`4e3e037e237ef11e752f645926c4071a4d25c61c`.
[UAT request #41538667672](https://github.com/OXY7O/kaori-website/actions/runs/41538667672)
correctly failed closed because the only Website Compose project was already
attached to the production shared edge. This is a **runtime isolation**
finding, not a signing or request-branch trigger failure.

Issue #124 separates `kaori-website-uat` and its loopback-only port, source
adapter, release receipt and rollback from the publicly attached stable Website.
A new reviewed staging SHA and its own signed RC are required before a real
private deployment attempt; do not mutate or relabel the accepted RC.1 image.
Full Admission, private host health, independent production health, browser
review and Human Acceptance remain separate evidence.
