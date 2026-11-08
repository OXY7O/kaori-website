# KAORI Website CI/CD

**Authority:** This website follows `OXY7O/KAORI/docs/engineering/KAORI_DELIVERY_WORKFLOW.md` and `docs/setup/GITHUB_ACTIONS_CI_CD.md`, with domain-appropriate website validation.

## Runner ownership

As integrated into official `kaori/staging` through [PR #146](https://github.com/OXY7O/kaori-website/pull/146) and the [runtime remediation PR #149](https://github.com/OXY7O/kaori-website/pull/149), trusted Route Checks, Website Validation, and nonpublishing Full Admission run on ephemeral GitHub-hosted workers. Public fork feedback remains separate, and privileged release/deployment access stays restricted:

| Stage                                                | Runner selector                          |
| ---------------------------------------------------- | ---------------------------------------- |
| Developer Check / routing and targeted validation    | `ubuntu-24.04` (GitHub-hosted)           |
| Full Admission / promotion, Node, container, browser | `ubuntu-24.04` (GitHub-hosted)           |
| Stable release publication                           | `platform-ci` (self-hosted / restricted) |
| RC publication / release control                     | `platform-ci` (self-hosted / restricted) |
| Release deployment                                   | `kaori-ci` (self-hosted / restricted)    |

**Important:** Remaining self-hosted release jobs still require verified repository/group eligibility; matching runner labels alone does not grant access. The operator must grant the new repo access via an appropriately scoped **organization runner or runner group** (or an additional independent registration, if approved). Runner registration and groups are external operational authority and must be inspected before CI is counted as PASS. Do not deregister or repurpose KAORI's working runner in order to enable this repository.

Temporary release runner co-location with the deployment VPS retains the SSH trust boundary; no direct container deployment is made from the runner's local Docker daemon into the application namespace.

The earlier [trusted hosted Developer Check increment #138 / PR #139](https://github.com/OXY7O/kaori-website/pull/139) was integrated, rather than merging its superseded Draft PR. The combined staging candidate passed [exact-head Developer Check #42444593112](https://github.com/OXY7O/kaori-website/actions/runs/42444593112). After the security runtime fix, official staging `898b4b97eb1465909b8d6f1b41184daa78c21981` passed [Full Admission #42445238337](https://github.com/OXY7O/kaori-website/actions/runs/42445238337): `Promotion Policy`, `Full Admission`, `Container Admission`, and `Browser Quality Evidence` all succeeded. The latter published an immutable browser artifact, and the updated pinned NGINX image scan reported **0 vulnerabilities** (Alpine 3.24.3). `Publish Accepted Stable Release` was SKIPPED by scope; this does **not** establish an RC deployment or Human UAT.

Browser evidence continues to run inside the pinned Playwright container, now on ephemeral GitHub-hosted compute; persistent self-hosted checkout-ownership repair is conditional and skipped on hosted jobs. Actual Docker/Playwright and required quality gates must pass at the exact admission SHA; moving the runner selector is not UAT or release authorization.

## Untrusted community PR runner boundary (#140)

External fork pull requests targeting `kaori/staging` receive feedback from
`Community Fork Check` on an ephemeral GitHub-hosted runner with read-only
permissions, exact-source checkout and `npm ci --ignore-scripts`.
The canonical required `Route Checks` job is already hosted under #138/#142
and **fails** an untrusted fork in its initial source-identity step before
any checkout; it does not merely skip a required status check. Hosted
`Website Validation` depends on successful route verification and now
executes the existing fork-boundary regression contract alongside formatting,
Astro/TypeScript and static build checks.

This integration **preserves the newer hosted CI architecture** already
recorded above. Container/release-specific self-hosted jobs retain their
separate eligibility, scoped credentials and governed approval. For `main`
promotion PRs, hosted `Promotion Policy` explicitly fails sources other than
trusted same-repository `kaori/staging` before downstream admission.
Fork feedback is neither trusted Developer Check, Full Admission, UAT
nor release authority. Effective main/staging rulesets have been read back and
official staging Full Admission has passed on the SHA above. A controlled
[same-repository invalid-branch PR #153](https://github.com/OXY7O/kaori-website/pull/153)
confirmed hosted `Route Checks` fails before checkout and downstream
self-hosted jobs are skipped; the probe was closed **without merge**.
A real external-fork-origin test and staged deployment/Human Acceptance
are still required; do not interpret same-repository negative evidence as
a real fork test.

## Governed Dependabot intake — #160

The `.github/dependabot.yml` proposal monitors npm, root Dockerfile, DevContainer Dockerfile and SHA-pinned GitHub Actions on a bounded weekly cadence (Monday 09:00 Asia/Jakarta). Only version updates target `kaori/staging`; security updates always target default `main` and require the separate native Dependabot Security Updates setting. No auto-merge, release, deployment, secret or runner permission is granted.

**Activation boundary:** GitHub reads Dependabot configuration from default `main`, not just from `kaori/staging`. A future reviewed staging-to-main promotion and actual Dependabot readback are necessary before version updates can be called active. GitHub Alerts and CodeQL are separate native security settings governed by [#150](https://github.com/OXY7O/kaori-website/issues/150).

**Trust boundary:** Dependabot PRs are intake, not accepted implementation. The existing Developer Check requires a same-repository, issue-linked KAORI source branch and must reject ordinary bot branches. A maintainer must triage each proposed change under an accepted issue, reproduce it on a trusted issue-linked branch, obtain independent review, then run Developer Check, staging Full Admission, container scanning, browser quality, and relevant UAT before promotion. Security-update PRs targeting `main` must not bypass this process.

## Gate contracts

1. **Issue → work branch:** canonical branch `kaori/<type>-<issue>-<slug>`, source from current `kaori/staging`.
2. **Developer Check:** a PR targeting `kaori/staging` validates same-repository and issue-linked branch; `git diff --check` always runs. Website-impact paths run locked install, Astro check and static build; dependency authority changes additionally run high-severity npm audit. Docs-only edits do not rebuild/deploy.
3. **Review:** an approved review, exact-head green Developer Check and resolved findings are required before merge. Work branch builds are not Full Admission.
4. **Staging Full Admission:** on exact merged `kaori/staging` commit, checks formatting, TypeScript/Astro, dependencies, production build and static output. No work-branch Full Admission. Docker Runtime Admission now runs on admitted staging; actual browser Visual QA, deployed HTTPS/TLS, hostname authority and human acceptance are still separate release gates. A green static validation is never sufficient to claim full release readiness.
5. **Release candidate:** use reviewed exact SHA and immutable OCI digest; independently verify rendered website, light/dark and mobile behavior, accessibility and deployed TLS.
6. **Human acceptance → promotion PR:** only `kaori/staging` may target `main`; do not accept direct work-branch-to-main PRs. Stable release uses the admitted image digest without rebuilding application bits.

## External protection configuration

**Verified GitHub branch settings (2026-11-08):** the public repository's `main` and `kaori/staging` are protected with active branch-safety ruleset **#26685572** (no deletion/non-fast-forward) and PR-only ruleset **#26685631** (one independent approval, stale-dismissal and resolved review conversations; no bypass). Staging ruleset **#26685877** requires exact GitHub Actions contexts `Route Checks` and `Website Validation`. Main ruleset **#26786379** requires `Promotion Policy`, `Full Admission`, `Container Admission`, and `Browser Quality Evidence`, all with GitHub Actions integration **15368**. Read-back after subsequent admin changes is still mandatory; neither protected branches nor successful CI substitute for deployed staging/UAT, signed immutable RC, release verification or explicit human acceptance. Native GitHub CodeQL configuration is a separate [security workstream #150](https://github.com/OXY7O/kaori-website/issues/150), not an admission gate in this document.

Use repository-scoped Actions Variables and Secrets for approved release jobs as already configured; GitHub-hosted admission does not use publication credentials. Do not infer that organization/environment secrets or policies are enabled without a verified settings readback. The Developer Check and Full Admission require no custom credentials. The canonical `publish-staging-image.yml` RC publisher and `deploy-staging-host.yml` release deployment use repository-scoped registry and SSH credentials with explicit operator authority and an admitted exact staging SHA. These are **manual** release operations and must not be turned into unconditional push-to-deploy behavior. Both were authored on staging, and the default-branch dispatch limitation is documented below.

Runner access, GitHub Project custom fields, native relationships, and review metadata still require GitHub-side setup where connector capabilities are absent. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state — public RC.7 checkpoint (2026-11-08)

The most recent **verified public release deployment** is signed [v0.1.2-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2-rc.7), from protected `kaori/staging@b77a8dc98d4b342e7002e251fe4ff0abc7149dbe`, immutable OCI digest `sha256:d686b54a219ea96d60a108bf947f9d0f540275c230171c92ede06a14c56cb10c`. [Exact-source Full Admission #42482112697](https://github.com/OXY7O/kaori-website/actions/runs/42482112697) passed all four mandatory nonpublishing jobs (156 browser tests; configured Trivy HIGH/CRITICAL scan: zero reported findings); [signed RC publisher #42484280809](https://github.com/OXY7O/kaori-website/actions/runs/42484280809) and [isolated private UAT #42484609068](https://github.com/OXY7O/kaori-website/actions/runs/42484609068) succeeded. Maintainer explicitly accepted six **private RC.7** Visual UAT checks.

Under [specific public-cutover authority #158](https://github.com/OXY7O/kaori-website/issues/158), [manual public Release Deployment #42488631688](https://github.com/OXY7O/kaori-website/actions/runs/42488631688) completed SUCCESS on that same SHA and digest, with `publish_existing_edge=true`. The existing `kaori-website` public Compose slot, public footer `Website build v0.1.2-rc.7`, Website HTTPS readiness and independent Application/Docs HTTPS readiness passed recorded deployment checks. A subsequent fail-closed operator script returned the final marker `PASS: Public Website RC.7, Application and Docs readiness`; public `release.env` and prior signed **RC.5** rollback identity were exercised within that script, but full intermediate readback was not separately pasted.

**Accepted 2026-11-09:** the maintainer explicitly recorded **Public Human UAT PASS** on live `kaori.cloud`, following verified signed RC.7/previous RC.5 receipt and rollback checks, safe private `kaori-website-uat/web` retirement with public/private receipts preserved, and successful post-retirement Website/Application/Docs HTTPS readiness. [Operational #158](https://github.com/OXY7O/kaori-website/issues/158) and [recovery #156](https://github.com/OXY7O/kaori-website/issues/156) are **CLOSED / completed**. Installed public `musl`/`musl-utils` are `1.2.6-r3`, and `zlib` is `1.3.2-r1`; [runtime security #147](https://github.com/OXY7O/kaori-website/issues/147) is completed. Outstanding independent controls are a real external-fork negative test [#140](https://github.com/OXY7O/kaori-website/issues/140), native GitHub CodeQL/security-settings evidence [#150](https://github.com/OXY7O/kaori-website/issues/150), separate rights approval [#136](https://github.com/OXY7O/kaori-website/issues/136), and governed Dependabot default-branch activation [#160](https://github.com/OXY7O/kaori-website/issues/160). RC.7 UAT does **not** authorize an unrelated `main` promotion, stable publication, or dependency-bot bypass.

## Historical signed public candidate — v0.1.0-rc.7

The previously deployed candidate was [v0.1.0-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7) from exact staging source `1c23699206eb176affd99c7ff6603918ec0a9aed` and immutable OCI digest `sha256:aa1de44231fda4cfb485704cae493b0569da3534e3bd3193bad00fa360cf60ea`. [Full Admission + Docker Runtime Admission #39105396294](https://github.com/OXY7O/kaori-website/actions/runs/39105396294) and [signed publication plus public SSH/edge deployment #39105396334](https://github.com/OXY7O/kaori-website/actions/runs/39105396334) **PASS** on the exact merged SHA. The previous RC.6 digest remains the immutable rollback candidate. One-time workflow `publication-48-once.yml` was retired after verified publication; cleanup SHA is not part of the published RC.7 image. Browser light/dark/responsive QA and explicit human acceptance are **PENDING**; `main` stays on HOLD.

## Canonical Release Workflows

| Workflow                    | Trigger                                                          | Responsibility                                                                                                             |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `developer-check.yml`       | Issue-linked PR → `kaori/staging`                                | Path-aware Route Checks, targeted Astro/format/build, optional Docker/Trivy and registry preflight.                        |
| `quality.yml`               | Staging/main push, promotion PR, manual admission when available | Full Admission (format, typecheck, npm audit, static build) **and Docker Runtime Admission**; no deployment.               |
| `publish-staging-image.yml` | Explicit RC manual dispatch                                      | Exact admitted staging SHA, immutable image, Trivy HIGH/CRITICAL, SBOM/provenance, keyless signature and release evidence. |
| `deploy-staging-host.yml`   | Explicit release deployment dispatch                             | Pin SSH trust, validate signed RC/digest and approval reference; deploy only the standalone website.                       |

**Retired release bootstrap automation:** One-time private image, port diagnosis, ingress repair and RC.2/RC.4/RC.5/RC.6/RC.7 staging activation workflows were retired under #20 after exact-source execution. Historical Actions evidence remains in #10, #15, #21, #27, #30, #38 and #43, and #48. The supported workflow surface is the **four canonical workflows** shown above; no automatic staging push release/deploy pipeline remains.

GitHub `workflow_dispatch` requires the workflow on the **default branch**. The website `main` was promoted via approved [PR #71](https://github.com/OXY7O/kaori-website/pull/71), and [stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) is published using the already signed RC.10 image digest. Canonical manual publisher and deployer workflows are now present on the default branch; release authorization, exact-source admission, immutable image verification, and human acceptance remain mandatory. Do not reinstate per-RC workflow YAML or implement automatic push-to-deploy. Historical Actions runs are audit evidence.

## Release boundary and edge acceptance

The active HTTPS services are `https://kaori.cloud` (Website), `https://app.kaori.cloud` (Application), and `https://docs.kaori.cloud` (Docs). The former n8n service `auto.kaori.cloud` was retired under [#130](https://github.com/OXY7O/kaori-website/issues/130) and must **not** be used as a current health dependency. The existing public Website slot serves the accepted signed RC.7 as verified above, rather than a second parallel RC/stable slot.

Historical [v0.1.0-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7) passed its own release and shared-edge validation when n8n was active; this is **historical evidence**, not the current source, endpoint or acceptance state. [Stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) was promoted under its own past authorization; it is not a standing approval to promote the latest staging SHA.

Use only the existing KAORI shared-edge scripts and operator-managed DNS/TLS/Host-SNI/rollback procedures. Validate the public Website build footer, its immutable digest, retained previous signed RC.5 rollback receipt, Application/Docs readiness, responsive/accessibility behavior and explicit **live public** Human Acceptance. The one-slot public cutover and temporary private UAT retirement remain independently governed by [#158](https://github.com/OXY7O/kaori-website/issues/158).

## Canonical Actions display labels — issue #23 (stable v0.1.0)

The current GitHub Actions sidebar is defined by the following **four existing workflow files**. Display names are intentionally independent of filenames and job IDs; changing their labels must not change `needs`, trigger conditions, security permissions or validated release contracts.

| Workflow file                                 | Workflow display name  | Job display labels                                                                     |
| --------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `.github/workflows/developer-check.yml`       | **Developer Check**    | Route Checks, Website Validation, Container Validation, Release Configuration          |
| `.github/workflows/quality.yml`               | **Full Admission**     | Promotion Policy, Full Admission, Container Admission, Publish Accepted Stable Release |
| `.github/workflows/publish-staging-image.yml` | **Release Candidate**  | Publish Release Candidate                                                              |
| `.github/workflows/deploy-staging-host.yml`   | **Release Deployment** | Deploy Release Candidate                                                               |

Pull-request runs include their PR/branch label; manual release runs show the selected candidate tag. The stable-publication job is issue-bounded: its previous issue #72 marker was consumed by stable v0.1.0 and its next approved marker [KAORI_WEBSITE_STABLE_RELEASE_94] is gated on explicit v0.1.1 RC.3 Human Acceptance, reviewed staging-to-main PR, and exact-main source, container and browser admission. Ordinary pushes do not publish a stable release.

**Historical entries are expected:** GitHub Actions may continue listing retired `KAORI Website One-Time RC.x ...` workflows that executed before their YAML was removed. Their run metadata and audit evidence are preserved. Do not delete historical runs to hide names, change existing workflow file paths to manipulate history, or imply that historic workflow names remain active.

**Check-context migration:** job display labels changed only, job IDs remain stable. The maintainer should inspect any manually configured GitHub ruleset/branch-protection required-check names, third-party status consumers and GitHub Project automation for references to the old display names. The private repository previously used compensating review procedures; do not assert branch protections are enforced without checking repository settings.

**Operating state:** [stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) is published on main, reusing the signed deployed RC.10 digest, without a new image build. This naming-only workstream does not redeploy that image, modify shared-edge runtime or make product changes. External provider names, immutability and signed-evidence authority remain unchanged.

## Explicit Website release request branches — #122

Website RC and UAT use deliberate `kaori/rc-request` and `kaori/uat-request` branch pushes.
Ordinary staging pushes only run Full Admission and never publish or deploy.
The existing Release Candidate and Release Deployment workflows retain manual dispatch.

**RC request:** The operator advances `kaori/rc-request` to the current admitted staging SHA.
The publisher checks exact source and Full Admission before building a signed immutable image.
It resolves the next patch RC from Website stable release tags, not `package.json`.
Already published same-source RCs are not rebuilt; incomplete reserved tags fail closed.

**UAT request:** Only after signed RC publication, advance `kaori/uat-request` to that SHA.
The deploy workflow requires exactly one prerelease and matching tag/source authority.
It also checks successful signed publisher evidence and the source's merged staging PR.
It retains the existing digest, SSH trust, Compose verification and rollback controls.
The request-branch path always disables public-edge attachment; Human UAT remains separate.

**Manual fallback:** Dispatch existing workflows on `kaori/staging` with the approved tag,
authorization reference and appropriate edge flag. A manual release does not waive admission.
For failure or stale request, reconcile the Git refs and evidence before a new request;
never overwrite an immutable tag or force an invalid branch SHA.

This work is scoped by [Website #122](https://github.com/OXY7O/kaori-website/issues/122)
and [KAORI #4201](https://github.com/OXY7O/KAORI/issues/4201).
Stable/production automation remains #119 and admission caching remains #118.
