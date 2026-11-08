# KAORI Website CI/CD

**Authority:** This website follows `OXY7O/KAORI/docs/engineering/KAORI_DELIVERY_WORKFLOW.md` and `docs/setup/GITHUB_ACTIONS_CI_CD.md`, with domain-appropriate website validation.

## Runner ownership

For the integrated hosted CI candidate (#138 and #142), trusted Route Checks, Website Validation, and nonpublishing Full Admission run on ephemeral GitHub-hosted workers. Public fork feedback remains separate, and privileged release/deployment access stays restricted:

| Stage                                                | Runner selector                          |
| ---------------------------------------------------- | ---------------------------------------- |
| Developer Check / routing and targeted validation    | `ubuntu-24.04` (GitHub-hosted)           |
| Full Admission / promotion, Node, container, browser | `ubuntu-24.04` (GitHub-hosted)           |
| Stable release publication                           | `platform-ci` (self-hosted / restricted) |
| RC publication / release control                     | `platform-ci` (self-hosted / restricted) |
| Release deployment                                   | `kaori-ci` (self-hosted / restricted)    |

**Important:** Remaining self-hosted release jobs still require verified repository/group eligibility; matching runner labels alone does not grant access. The operator must grant the new repo access via an appropriately scoped **organization runner or runner group** (or an additional independent registration, if approved). Runner registration and groups are external operational authority and must be inspected before CI is counted as PASS. Do not deregister or repurpose KAORI's working runner in order to enable this repository.

Temporary release runner co-location with the deployment VPS retains the SSH trust boundary; no direct container deployment is made from the runner's local Docker daemon into the application namespace.

The validated [trusted hosted Developer Check increment #138 / PR #139](https://github.com/OXY7O/kaori-website/pull/139) is incorporated into this candidate without changing validation commands or token permissions. The combined PR must pass its own exact-head Developer Check; source-specific prior success does not transfer Full Admission authority.

Browser evidence continues to run inside the pinned Playwright container, now on ephemeral GitHub-hosted compute; persistent self-hosted checkout-ownership repair is conditional and skipped on hosted jobs. Actual Docker/Playwright and required quality gates must pass at the exact admission SHA; moving the runner selector is not UAT or release authorization.

## Gate contracts

1. **Issue → work branch:** canonical branch `kaori/<type>-<issue>-<slug>`, source from current `kaori/staging`.
2. **Developer Check:** a PR targeting `kaori/staging` validates same-repository and issue-linked branch; `git diff --check` always runs. Website-impact paths run locked install, Astro check and static build; dependency authority changes additionally run high-severity npm audit. Docs-only edits do not rebuild/deploy.
3. **Review:** an approved review, exact-head green Developer Check and resolved findings are required before merge. Work branch builds are not Full Admission.
4. **Staging Full Admission:** on exact merged `kaori/staging` commit, checks formatting, TypeScript/Astro, dependencies, production build and static output. No work-branch Full Admission. Docker Runtime Admission now runs on admitted staging; actual browser Visual QA, deployed HTTPS/TLS, hostname authority and human acceptance are still separate release gates. A green static validation is never sufficient to claim full release readiness.
5. **Release candidate:** use reviewed exact SHA and immutable OCI digest; independently verify rendered website, light/dark and mobile behavior, accessibility and deployed TLS.
6. **Human acceptance → promotion PR:** only `kaori/staging` may target `main`; do not accept direct work-branch-to-main PRs. Stable release uses the admitted image digest without rebuilding application bits.

## External protection configuration

**GitHub Settings authority:** The repository is public; effective branch rulesets, required checks, runner groups, and protected Environment enforcement must be read back independently by an authorized administrator. Historical private-repository exceptions do not establish the current settings state. Use issue-linked Draft PRs, a recorded manual reviewer decision, exact-SHA Developer Check, staging admission, and explicit release verification and human acceptance. This is a compensating **procedure**, not equivalent enforcement. Do not claim protection is enabled; revisit enforcement if the plan changes.

Use repository-scoped Actions Variables and Secrets for approved release jobs as already configured; GitHub-hosted admission does not use publication credentials. Do not infer that organization/environment secrets or policies are enabled without a verified settings readback. The Developer Check and Full Admission require no custom credentials. The canonical `publish-staging-image.yml` RC publisher and `deploy-staging-host.yml` release deployment use repository-scoped registry and SSH credentials with explicit operator authority and an admitted exact staging SHA. These are **manual** release operations and must not be turned into unconditional push-to-deploy behavior. Both were authored on staging, and the default-branch dispatch limitation is documented below.

Runner access, GitHub Project custom fields, native relationships, and review metadata still require GitHub-side setup where connector capabilities are absent. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state

The current public website serves signed [v0.1.0-rc.6](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.6) from exact staging source `b8ccb60f0c208b7f8de268f459eacbb309e6f24a`, immutable digest `sha256:f43635107bd541c173a059ddebbb70d36d2677494c2084ebb821d6dde4a699cc`. The [Full Admission and Docker Runtime Admission](https://github.com/OXY7O/kaori-website/actions/runs/39098822528), plus [signed RC.6 release and SSH public-edge verification](https://github.com/OXY7O/kaori-website/actions/runs/39098822357) **PASS** after a fail-closed admission-wait retry. Reviewed [PR #42](https://github.com/OXY7O/kaori-website/pull/42) contains the approved KAORI Hero artwork and ecosystem copy. Previous signed RC.5 remains immutable rollback authority. The workflow retirement change **is not** part of the deployed RC.6 image. `main` remains on HOLD pending browser Visual QA and explicit human acceptance.

## Historical signed public candidate — RC.7

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

`https://kaori.cloud` **now serves KAORI Website**, independently of `https://app.kaori.cloud` (KAORI Application) and `https://auto.kaori.cloud` (n8n). The operator initially cut over the apex under #21. For historical RC.7, the existing-edge registration preflight and post-redeploy attachment passed, followed by HTTPS `/healthz` for the website, application readiness, and n8n readiness on the accepted immutable digest. The private `127.0.0.1:18080` loopback binding also passed; public HTTPS health is separate. Maintainer UAT acceptance and `main` promotion have since completed for stable v0.1.0. Automated browser light/dark/mobile/accessibility and performance coverage remain open under #58; health checks cannot substitute for that work.

Use only the existing KAORI shared-edge scripts and host-side DNS/TLS readiness/rollback runbook. Collect apex-vs-app routing, HTTPS certificate, Host/SNI negative checks, n8n unaffected, visual/accessibility and explicit human acceptance before promotion. Every public edge cutover is reviewed separately from the website container release.

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
