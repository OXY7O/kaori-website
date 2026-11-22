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

Contributor-facing source/target branch setup, clean fork history, conflict
recovery and first-time GitHub workflow approval are documented in the
[external fork walkthrough](DEVELOPMENT.md#external-fork-prs--controlled-pre-launch-procedure).
This is controlled pre-launch feedback, not a general contribution or licensing
authorization while KAORI rights and community approvals remain outstanding.

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
**Accepted external-fork evidence (2026-11-09):** real external [PR #174](https://github.com/OXY7O/kaori-website/pull/174) ran [Community Fork Check #42531766112](https://github.com/OXY7O/kaori-website/actions/runs/42531766112) **SUCCESS** on an unprivileged GitHub-hosted worker; trusted [Developer Check #42531766116](https://github.com/OXY7O/kaori-website/actions/runs/42531766116) intentionally **FAILED** `Route Checks` before checkout and skipped privileged downstream jobs. The disposable fork PR was closed **unmerged**. Independently reviewed contributor guidance [PR #173](https://github.com/OXY7O/kaori-website/pull/173) merged to `kaori/staging@de5041eaedd7fef5d1677b196346829eaf0bddbc`, with [post-merge Full Admission #42533429126](https://github.com/OXY7O/kaori-website/actions/runs/42533429126) **SUCCESS**. This proves the scoped fork feedback/trust partition, **not** legal redistribution permission or community launch.

## Governed Dependabot intake — #160

The `.github/dependabot.yml` configuration monitors npm, root Dockerfile, DevContainer Dockerfile and SHA-pinned GitHub Actions on a bounded weekly cadence (Monday 09:00 Asia/Jakarta). Only version updates target `kaori/staging`; security updates always target default `main` and require the separate native Dependabot Security Updates setting. No auto-merge, release, deployment, secret or runner permission is granted.

**Verified default-branch activation (2026-11-09):** GitHub reads this configuration from `main`. Reviewed [promotion PR #169](https://github.com/OXY7O/kaori-website/pull/169) merged source-only to `main@41091df060e406e2ade7ae63fc67bc65c4454559`; Dependabot subsequently opened eight genuine version-update proposals [#175–#182](https://github.com/OXY7O/kaori-website/pulls?q=is%3Apr+is%3Aclosed+author%3Aapp%2Fdependabot), all targeting `kaori/staging`. Each was triaged and **closed unmerged** because its exact upgrade lacked governed acceptance. The weekly updater remains active; newly generated proposals must be assessed independently. GitHub Alerts and CodeQL are separate native security controls governed by [#150](https://github.com/OXY7O/kaori-website/issues/150).

**Trust boundary:** Dependabot PRs are intake, not accepted implementation. The existing Developer Check requires a same-repository, issue-linked KAORI source branch and must reject ordinary bot branches. A maintainer must triage each proposed change under an accepted issue, reproduce it on a trusted issue-linked branch, obtain independent review, then run Developer Check, staging Full Admission, container scanning, browser quality, and relevant UAT before promotion. Security-update PRs targeting `main` must not bypass this process.

## Verified native GitHub security — #150

As of 2026-11-09, the maintainer's Advanced Security screenshots verify **Dependency graph, Dependabot alerts, Dependabot security updates, private vulnerability reporting, secret scanning/Secret Protection and push protection** enabled for the public Website repository. Native [CodeQL workstream #150](https://github.com/OXY7O/kaori-website/issues/150) is **CLOSED / completed**: GitHub-managed [CodeQL Setup #42523058510](https://github.com/OXY7O/kaori-website/actions/runs/42523058510) completed on exact protected default `main@6fe1f6304bf8cd43e34c633800e20768db781eda`, with `Analyze (javascript-typescript)`, `Analyze (actions)` and `Upload Results` all **SUCCESS**; merged SARIF upload completed. CodeQL uses Standard GitHub runner and Extended queries. Historical GitHub Actions setup failure remains historical evidence, not current coverage state; scan SUCCESS does not assert zero alerts.

**Native settings still requiring separate governance:** Malware alerts and direct alert-dismissal restrictions are OFF in the last screenshots; the GitHub preset auto-dismiss for low-impact development dependencies is ON while the malware-alert auto-dismiss preset is OFF. Evaluate these separately under [parent security #137](https://github.com/OXY7O/kaori-website/issues/137); no GitHub Settings toggles are changed by this repository document. Automatic dependency submission and grouped security updates remain disabled by current policy pending an actual coverage/triage need.

Dependabot **security updates** are independently active and generated [bot PR #162](https://github.com/OXY7O/kaori-website/pull/162) to `main`; the protected `Promotion Policy` correctly rejects this untrusted source. The security remediation `fast-uri@3.1.9` was separately adopted in governed [PR #165](https://github.com/OXY7O/kaori-website/pull/165) and admitted on `kaori/staging@f94cf90b50b72da8dda1e6f916e1d706d6ae17a0` via [Full Admission #42523033465](https://github.com/OXY7O/kaori-website/actions/runs/42523033465) (four mandatory jobs SUCCESS; 156 Playwright tests and configured container Trivy zero findings). Following separately approved [promotion PR #169](https://github.com/OXY7O/kaori-website/pull/169), default `main` contains the admitted `fast-uri@3.1.9` lockfile. Maintainer native Security-page evidence under [issue #164](https://github.com/OXY7O/kaori-website/issues/164) showed **Open 0 / Closed 4**, all four affected `fast-uri` alerts marked **Fixed**, not dismissed; #164 was closed completed. This readback is scoped to those alerts and its capture date, not a guarantee of future zero alerts. Neither a bot PR nor a CodeQL result authorizes bypassing release governance.

## Gate contracts

1. **Issue → work branch:** canonical branch `kaori/<type>-<issue>-<slug>`, source from current `kaori/staging`.
2. **Developer Check:** a PR targeting `kaori/staging` validates same-repository and issue-linked branch; `git diff --check` always runs. Website-impact paths run locked install, Astro check and static build; dependency authority changes additionally run high-severity npm audit. Docs-only edits do not rebuild/deploy.
3. **Review:** an approved review, exact-head green Developer Check and resolved findings are required before merge. Work branch builds are not Full Admission.
4. **Staging Full Admission:** on exact merged `kaori/staging` commit, checks formatting, TypeScript/Astro, dependencies, production build and static output. No work-branch Full Admission. Docker Runtime Admission now runs on admitted staging; actual browser Visual QA, deployed HTTPS/TLS, hostname authority and human acceptance are still separate release gates. A green static validation is never sufficient to claim full release readiness.
5. **Release candidate:** use reviewed exact SHA and immutable OCI digest; independently verify rendered website, light/dark and mobile behavior, accessibility and deployed TLS.
6. **Human acceptance → promotion PR:** only `kaori/staging` may target `main`; do not accept direct work-branch-to-main PRs. Stable release uses the admitted image digest without rebuilding application bits.

## External protection configuration

**Verified GitHub branch settings (2026-11-08):** the public repository's `main` and `kaori/staging` are protected with active branch-safety ruleset **#26685572** (no deletion/non-fast-forward) and PR-only ruleset **#26685631** (one independent approval, stale-dismissal and resolved review conversations; no bypass). Staging ruleset **#26685877** requires exact GitHub Actions contexts `Route Checks` and `Website Validation`. Main ruleset **#26786379** requires `Promotion Policy`, `Full Admission`, `Container Admission`, and `Browser Quality Evidence`, all with GitHub Actions integration **15368**. Read-back after subsequent admin changes is still mandatory; neither protected branches nor successful CI substitute for deployed staging/UAT, signed immutable RC, release verification or explicit human acceptance. Native GitHub CodeQL configuration is a separate [security workstream #150](https://github.com/OXY7O/kaori-website/issues/150), not an admission gate in this document.

Release and deployment configuration and secrets are exclusively scoped to the protected GitHub Environments `staging` and `production`. After the native Environment boundary, each resolver step binds its Environment configuration through a step-level `env` map using `vars.*`; `scripts/release/resolve-environment.sh` then validates and maps these runner inputs into the existing registry/SSH adapter names without logging values. GitHub configuration variables do not become shell environment variables merely by existing in the `vars` context. While old repository keys remain, GitHub's variable fallback can conceal missing Environment keys; operator must verify Environment values before deleting repository copies. Developer Check remains unprivileged and validates the release wiring contract; The former Environment Credential Preflight workflow was a one-time read-only diagnostic and is retired under Website #260 after both protected staging and production preflights passed; historical run links remain in the closure evidence. Mandatory admission and the signed release/target verification gates remain unchanged. Staging automatic RC activation remains Environment-scoped and default-off. **A push to main only runs admission; it cannot request production approval or publish a stable release.**

**Static OCI context and runtime safety (#277):** `.dockerignore` now defaults to excluding every path, explicitly allowing only static Astro inputs and the single reviewed NGINX server config. The production stage copies generated `dist/` and NGINX config, never the repository tree or Node modules. The shared Website Compose runtime explicitly enforces `101:101`, read-only filesystem, `cap_drop: ALL`, `no-new-privileges`, bounded tmpfs and existing network/resource limits. Existing Docker smoke and release contracts check these properties; signed RC publishing retains Trivy HIGH/CRITICAL scanning and immutable digest/SBOM/provenance gates. The Alpine NGINX runtime is **not** distroless and a non-root process does **not** prove a rootless host Docker daemon. Host rootless/true shell-less feasibility belongs to separate read-only assessment #279, and any future runtime mutation requires staging, security-sensitive UAT and protected production approval.

Production is reachable exclusively from the explicitly dispatched `release-production.yml` workflow on protected main, with native independent Environment approval and signed Human UAT evidence. The retired production auto-activation variable is not a release authorization. Do not infer Environment policies or matching values without administrator readback.

Runner access, GitHub Project custom fields, native relationships, and review metadata still require GitHub-side setup where connector capabilities are absent. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state — public RC.7 checkpoint (2026-11-08)

The most recent **verified public release deployment** is signed [v0.1.2-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2-rc.7), from protected `kaori/staging@b77a8dc98d4b342e7002e251fe4ff0abc7149dbe`, immutable OCI digest `sha256:d686b54a219ea96d60a108bf947f9d0f540275c230171c92ede06a14c56cb10c`. [Exact-source Full Admission #42482112697](https://github.com/OXY7O/kaori-website/actions/runs/42482112697) passed all four mandatory nonpublishing jobs (156 browser tests; configured Trivy HIGH/CRITICAL scan: zero reported findings); [signed RC publisher #42484280809](https://github.com/OXY7O/kaori-website/actions/runs/42484280809) and [isolated private UAT #42484609068](https://github.com/OXY7O/kaori-website/actions/runs/42484609068) succeeded. Maintainer explicitly accepted six **private RC.7** Visual UAT checks.

Under [specific public-cutover authority #158](https://github.com/OXY7O/kaori-website/issues/158), [manual public Release Deployment #42488631688](https://github.com/OXY7O/kaori-website/actions/runs/42488631688) completed SUCCESS on that same SHA and digest, with `publish_existing_edge=true`. The existing `kaori-website` public Compose slot, public footer `Website build v0.1.2-rc.7`, Website HTTPS readiness and independent Application/Docs HTTPS readiness passed recorded deployment checks. A subsequent fail-closed operator script returned the final marker `PASS: Public Website RC.7, Application and Docs readiness`; public `release.env` and prior signed **RC.5** rollback identity were exercised within that script, but full intermediate readback was not separately pasted.

**Accepted 2026-11-09:** the maintainer explicitly recorded **Public Human UAT PASS** on live `kaori.cloud`, following verified signed RC.7/previous RC.5 receipt and rollback checks, safe private `kaori-website-uat/web` retirement with public/private receipts preserved, and successful post-retirement Website/Application/Docs HTTPS readiness. [Operational #158](https://github.com/OXY7O/kaori-website/issues/158) and [recovery #156](https://github.com/OXY7O/kaori-website/issues/156) are **CLOSED / completed**. Installed public `musl`/`musl-utils` are `1.2.6-r3`, and `zlib` is `1.3.2-r1`; [runtime security #147](https://github.com/OXY7O/kaori-website/issues/147) is completed. Native GitHub CodeQL/security-settings evidence [#150](https://github.com/OXY7O/kaori-website/issues/150) is complete. Technically completed and closed controls include external-fork isolation [#140](https://github.com/OXY7O/kaori-website/issues/140), hosted admission [#142](https://github.com/OXY7O/kaori-website/issues/142), CodeQL [#150](https://github.com/OXY7O/kaori-website/issues/150), native Dependabot [#160](https://github.com/OXY7O/kaori-website/issues/160), fixed security alerts [#164](https://github.com/OXY7O/kaori-website/issues/164), and separately governed source-only `main` promotion [#168](https://github.com/OXY7O/kaori-website/issues/168) / [PR #169](https://github.com/OXY7O/kaori-website/pull/169). **Still blocked:** Website rights [#136](https://github.com/OXY7O/kaori-website/issues/136) by [KAORI #4212](https://github.com/OXY7O/KAORI/issues/4212), and public community launch under [KAORI #4217](https://github.com/OXY7O/KAORI/issues/4217). RC.7 UAT alone did not authorize promotion; the later independent PR #169 was source-only, **without** new release or deployment. No general contributor launch, license grant, or bot bypass is implied.

## Historical signed public candidate — v0.1.0-rc.7

The previously deployed candidate was [v0.1.0-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7) from exact staging source `1c23699206eb176affd99c7ff6603918ec0a9aed` and immutable OCI digest `sha256:aa1de44231fda4cfb485704cae493b0569da3534e3bd3193bad00fa360cf60ea`. [Full Admission + Docker Runtime Admission #39105396294](https://github.com/OXY7O/kaori-website/actions/runs/39105396294) and [signed publication plus public SSH/edge deployment #39105396334](https://github.com/OXY7O/kaori-website/actions/runs/39105396334) **PASS** on the exact merged SHA. The previous RC.6 digest remains the immutable rollback candidate. One-time workflow `publication-48-once.yml` was retired after verified publication; cleanup SHA is not part of the published RC.7 image. Browser light/dark/responsive QA and explicit human acceptance are **PENDING**; `main` stays on HOLD.

## Canonical Release Workflows

| Workflow                    | Trigger                                                          | Responsibility                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `developer-check.yml`       | Issue-linked PR → `kaori/staging`                                | Path-aware Route Checks, targeted Astro/format/build, optional Docker/Trivy and registry preflight.                                                                            |
| `quality.yml`               | Staging/main push, promotion PR, manual admission when available | Full Admission (format, typecheck, npm audit, static build) **and Docker Runtime Admission**; no deployment.                                                                   |
| `publish-staging-image.yml` | Explicit RC manual dispatch                                      | Exact admitted staging SHA, immutable image, Trivy HIGH/CRITICAL, SBOM/provenance, keyless signature and release evidence.                                                     |
| `deploy-staging-host.yml`   | Explicit release deployment dispatch                             | Pin SSH trust, validate signed RC/digest and approval reference; deploy only the standalone website.                                                                           |
| `release-production.yml`    | Explicit `workflow_dispatch` from protected `main`               | Check exact main admission, request stable tag and reviewed promotion PR, require native production reviewer, reconcile signed accepted digest, publish stable GitHub Release. |

**Retired release bootstrap automation:** One-time private image, port diagnosis, ingress repair and RC.2/RC.4/RC.5/RC.6/RC.7 staging activation workflows were retired under #20 after exact-source execution. Historical Actions evidence remains in #10, #15, #21, #27, #30, #38 and #43, and #48. The trusted admission/release surface retains the **four canonical workflows** shown above, **plus** isolated `.github/workflows/community-fork-check.yml` for external-fork feedback only. At this historical checkpoint no automatic staging push release/deploy pipeline existed; #202 was later merged as guarded source only.

**Manual signed RC request (Website #281):** The existing `publish-staging-image.yml` accepts an explicitly requested next patch RC tag **only** on the exact current admitted `kaori/staging` SHA. Its inline candidate selector rejects invalid/duplicate or reserved tags and unknown GitHub results, while a fully published, source-identical signed RC can be reused without rebuilding. The implementation is covered by the existing Node release-contract tests, including extracted Bash syntax verification and negative scenarios. After a completed fresh staging Full Admission and separate release authorization, an operator may run `gh workflow run publish-staging-image.yml -R OXY7O/kaori-website --ref kaori/staging -f candidate_tag=v0.1.4-rc.1` **only if** the protected current release state still selects that tag. The manual publisher builds/scans/signs/pushes and publishes an RC prerelease; it does **not** deploy the image or authorize production. Check the exact workflow run, immutable digest, signed attestations and release receipt before any isolated UAT. The `deploy-staging-host.yml` manual `publish_existing_edge=false` option does **not** on its own prove UAT isolation from the already running public Website; do not use it to replace the canonical public project without a distinct reviewed UAT namespace and host-specific evidence.

GitHub `workflow_dispatch` requires the workflow on the **default branch**. The website `main` was promoted via approved [PR #71](https://github.com/OXY7O/kaori-website/pull/71), and [stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) is published using the already signed RC.10 image digest. Canonical manual publisher and deployer workflows are now present on the default branch; release authorization, exact-source admission, immutable image verification, and human acceptance remain mandatory. Do not reinstate per-RC workflow YAML or enable ungoverned push-to-deploy; the #202 train has independent gates. Historical Actions runs are audit evidence.

## Release boundary and edge acceptance

The active HTTPS services are `https://kaori.cloud` (Website), `https://app.kaori.cloud` (Application), and `https://docs.kaori.cloud` (Docs). The former n8n service `auto.kaori.cloud` was retired under [#130](https://github.com/OXY7O/kaori-website/issues/130) and must **not** be used as a current health dependency. At this 2026-11-08 checkpoint the existing public Website slot served RC.7; signed public RC.9 was subsequently deployed and accepted only for its exact source under #198.

Historical [v0.1.0-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7) passed its own release and shared-edge validation when n8n was active; this is **historical evidence**, not the current source, endpoint or acceptance state. [Stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) was promoted under its own past authorization; it is not a standing approval to promote the latest staging SHA.

Use only the existing KAORI shared-edge scripts and operator-managed DNS/TLS/Host-SNI/rollback procedures. Validate the public Website build footer, its immutable digest, retained previous signed RC.5 rollback receipt, Application/Docs readiness, responsive/accessibility behavior and explicit **live public** Human Acceptance. The one-slot public cutover and temporary private UAT retirement remain independently governed by [#158](https://github.com/OXY7O/kaori-website/issues/158).

## Canonical Actions display labels — issue #23 (stable v0.1.0)

The original issue #23 display-label contract describes the following **four trusted workflow files**; the separate `community-fork-check.yml` workflow was added later for untrusted fork feedback. Display names are intentionally independent of filenames and job IDs; changing their labels must not change `needs`, trigger conditions, security permissions or validated release contracts.

| Workflow file                                 | Workflow display name  | Job display labels                                                              |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/developer-check.yml`       | **Developer Check**    | Route Checks, Website Validation, Container Validation, Release Configuration   |
| `.github/workflows/quality.yml`               | **Full Admission**     | Promotion Policy, Full Admission, Container Admission, Browser Quality Evidence |
| `.github/workflows/publish-staging-image.yml` | **Release Candidate**  | Publish Release Candidate                                                       |
| `.github/workflows/deploy-staging-host.yml`   | **Release Deployment** | Deploy Release Candidate                                                        |
| `.github/workflows/release-production.yml`    | **Production Release** | Validate Explicit Release Request, Release Accepted Artifact to Production      |

Pull-request runs include their PR/branch label; explicit production runs show the requested stable tag. Historical one-time stable release markers are retired. Ordinary source promotions never request production Environment approval; a separate manual release request is required, with the accepted RC digest retained as the signed image-build authority.

**Historical entries are expected:** GitHub Actions may continue listing retired `KAORI Website One-Time RC.x ...` workflows that executed before their YAML was removed. Their run metadata and audit evidence are preserved. Do not delete historical runs to hide names, change existing workflow file paths to manipulate history, or imply that historic workflow names remain active.

**Check-context migration:** job display labels changed only, job IDs remain stable. The maintainer should inspect any manually configured GitHub ruleset/branch-protection required-check names, third-party status consumers and GitHub Project automation for references to the old display names. The private repository previously used compensating review procedures; do not assert branch protections are enforced without checking repository settings.

**Operating state:** [stable v0.1.0](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0) is published on main, reusing the signed deployed RC.10 digest, without a new image build. This naming-only workstream does not redeploy that image, modify shared-edge runtime or make product changes. External provider names, immutability and signed-evidence authority remain unchanged.

## Explicit Website release request branches — #122 / #195

Legacy fallback RC and UAT use deliberate `kaori/rc-request` and `kaori/uat-request` branch pushes.
Until #202 is explicitly activated, staging pushes run only Full Admission.
The protected `staging` GitHub Environment may run the automated signed
release/deployment train only after all four admission jobs have succeeded
and the `KAORI_WEBSITE_AUTO_STAGING_ENABLED=true` protected Environment control
has been approved. No per-RC variable or manual dispatch is required.
The existing Release Candidate and Release Deployment workflows retain manual dispatch.

**RC request:** The operator advances `kaori/rc-request` to the current admitted staging SHA.
The publisher checks exact source and Full Admission before building a signed immutable image.
It resolves the next patch RC from Website stable release tags, not `package.json`.
Already published same-source RCs are not rebuilt; incomplete reserved tags fail closed.

**Public UAT request (#195):** Only after a signed RC and separate release-specific
public-cutover approval, advance `kaori/uat-request` to that exact admitted SHA.
The deploy workflow requires one matching signed prerelease, successful publisher,
merged staging PR, and exact approved SHA/tag/issue from maintainer-controlled
GitHub Actions variables. The open approval issue must explicitly contain
`Public UAT authorization: APPROVED`, `Source SHA: <sha>` and `RC tag: <tag>`.
Missing or stale approval **blocks before SSH** instead of deploying privately.
The approved request uses the existing public `kaori-website` Compose project,
signed digest, rollback receipt, shared-edge preflight and `https://kaori.cloud`
with App/Docs readiness. Live Human UAT remains separate from CI success.
The exact operator procedure and three approval variable names are in
[Deployment](DEPLOYMENT.md#current-approved-public-uat-request--195).

**Manual fallback:** Dispatch existing workflows on `kaori/staging` with the approved tag,
authorization reference and appropriate edge flag. A manual release does not waive admission.
For failure or stale request, reconcile the Git refs and evidence before a new request;
never overwrite an immutable tag or force an invalid branch SHA.

This request workflow originated in [Website #122](https://github.com/OXY7O/kaori-website/issues/122) and its public UAT revision [#195](https://github.com/OXY7O/kaori-website/issues/195)
and [KAORI #4201](https://github.com/OXY7O/KAORI/issues/4201).
Historic #119 stable publication has been superseded in source by #203; admission caching remains #118.

## Admission-gated automatic public staging — #201 / #202

**Source checkpoint, 2026-11-17:** PR #205 merged with 4/4 admission PASS (run #44006999386); both RC publication and deployment jobs SKIPPED. Rights #4939 remains HOLD, so no new public RC is approved by that merge.

**Operating model:** \`kaori/staging\` is the source for GitHub Environment
\`staging\`. The signed RC, when automatically deployed, replaces the **same
single** \`kaori-website\` public runtime at \`https://kaori.cloud\`. This
public exposure **precedes** production approval as the maintainer-approved
single-server efficiency tradeoff. There is no parallel staging hostname,
second public Docker project or automatic DNS/TLS modification.

The existing \`quality.yml\` remains the one entrypoint: Promotion Policy,
Full Admission, Container Admission and Browser Quality Evidence must all
succeed on the protected merged SHA before the two dependent jobs can run.
The trusted \`platform-ci\` publisher uses the existing
\`scripts/release/publish-candidate.sh\` signer/scan/SBOM/provenance to choose
the next unique RC, or reuse an already signed exact-source release without
rewriting its tag. The \`kaori-ci\` deployment job uses existing
\`scripts/release/deploy-release.sh\`, pinned SSH trust, one public Compose
project, existing shared-edge preflight/reattach, committed digest receipt,
rollback and Website/Application/Docs checks. Its deployment concurrency
group is \`kaori-website-release-deploy\`, shared with the existing manual
Release Deployment fallback. Human UAT is always a separate acceptance.

**Activation boundary:** This source change is intentionally inactive while
\`KAORI_WEBSITE_AUTO_STAGING_ENABLED\` is absent/not \`true\`. An authorized
repository administrator must first verify GitHub Environment \`staging\`
(branch \`kaori/staging\`, no unexpected manual reviewers), scoped secrets,
runner identity and rollback baseline, as well as an explicitly accepted
ongoing public RC publication exception under KAORI #4212. The environment
can be configured once; individual releases require no manual tag/dispatch.
Do **not** claim a successful staging auto-release merely because the source
PR and Developer Check pass. The former \`rc-request\` and \`uat-request\`
paths remain legacy fallbacks until the new flow is proven in live UAT.

**Standing first-party publication authorization (#4939):** The KAORI creator/maintainer has explicitly approved ongoing public Website operation and signed release publication. The one-time automation variable remains an activation switch, **not** a rights grant. The existing rights preflight reads the cross-repository [KAORI #4939](https://github.com/OXY7O/KAORI/issues/4939) before selecting an RC, before tag/Release creation and again before public deployment.

The issue must be **closed/completed**, with exactly one unedited, authenticated owner `lethisa` standing authorization comment predating closure:

- Maintainer/owner: `KAORI_WEBSITE_PUBLICATION_GO:STANDING`
- Revocation: `KAORI_WEBSITE_PUBLICATION_REVOKED:STANDING` by the owner or designated security reviewer; any revocation blocks future publication

Invalid issue state, missing/edited owner evidence, revoked standing permission, unavailable GitHub API and incomplete comment coverage **fail closed**. The same standing permission applies to later protected staging source commits; there is **no extra per-SHA issue reviewer approval**. The two required GitHub approval levels remain (1) independent protected PR code review with Developer Check/Full Admission and (2) actual production Environment deployment approval. New RCs still require signed identity, successful vulnerability checks, rollback and Human UAT before protected stable promotion. Public source relicensing, trademark sublicensing and third-party notices are separate rights decisions; a standing owner release operation does not rewrite those licenses.

This scope replaces the older per-SHA reviewer-comment condition introduced for conservative fail-closed behavior in #208; it does not disable the rights preflight, allow direct `main`, or enable staging publishing before authorized activation. Historical RC.9/RC.10 owner UAT remains exact-digest evidence, not automatic acceptance of newly built bits. Manual separately authorized recovery remains under existing authority.

**Production is independent:** \`main\` promotion and the protected
\`production\` Environment approval are a separate implementation child
[#203](https://github.com/OXY7O/kaori-website/issues/203). Both GitHub
Environments intentionally select the same public runtime now, but production
must not report an older digest as active after a newer staging deployment.
Stable promotion reuses the accepted RC image, with no rebuild.

## Explicit production release request — Website #257

**Current approved correction (2026-11-22):** Protected `kaori/staging → main` promotion is **source promotion only**. Every `main` push executes `quality.yml` mandatory Full Admission; it must **not** queue a production Environment deployment job or publish a stable tag. The previous push-coupled production job in Website #201/#203 is superseded **only for trigger timing**. Its immutable RC→Human UAT→signed stable digest/rollback contract remains authoritative.

A stable release begins **only** when an authorized maintainer explicitly requests one from GitHub Actions → **Production Release** (`.github/workflows/release-production.yml`) on protected `main`. For example, after separate release authorization:

```bash
gh workflow run release-production.yml -R OXY7O/kaori-website --ref main \
  -f stable_tag=vX.Y.Z
```

The example values are placeholders, not a ready-to-execute release. Do not dispatch until the maintainer explicitly asks for that stable release and the linked RC's Human UAT is accepted. Merely approving a PR or reaching main is not this authorization.

**Prepare notes before requesting release:** On an authenticated maintainer workstation or Dev Container with current `kaori/staging` source, run `bash scripts/release/prepare-notes.sh vX.Y.Z`. GitHub generates a **read-only draft** from the latest stable baseline to protected `kaori/staging`; it does not create a tag, release or deployment. The maintainer's successful 2026-11-22 operational preview returned `<!-- Release notes generated using configuration in .github/release.yml at kaori/staging -->`, with the custom Website and Documentation / Security and Reliability categories; therefore, **do not assume configuration is read only from default `main`**. When `target_commitish=kaori/staging` and `configuration_file_path` is omitted, the observed GitHub response identified the staging configuration. The helper intentionally omits the optional path that previously caused HTTP 400; always inspect the returned comment/categories to confirm actual provenance, and treat the output as an editorial **draft**, not release authority. Edit the draft into `docs/releases/vX.Y.Z.md` using the four human-facing sections **Highlights**, **Improvements**, **Fixes**, and **Known Limitations**. Include strict frontmatter `stable_tag: vX.Y.Z` and `promotion_pr: 123` (the genuine independently reviewed, merged staging→main promotion PR; placeholders here are examples). Submit the notes through the normal issue-linked PR to staging, complete Full Admission, and promote the notes to main by reviewed PR. This documentation-only promotion does not change the accepted OCI build inputs or itself authorize release.

Production Release now needs **only one input, the stable version**. Its unprivileged gate checks out exact protected main, validates that version's **reviewed** notes, derives the authorized promotion PR from the committed notes metadata, verifies the requester, exact-main Full Admission, actual merged promotion and Human UAT pointer, and blocks malformed or missing evidence **before** asking for protected production approval. The privileged production runner independently repeats notes→promotion→signed RC validation. A new stable release cannot publish only raw SHA/digest lines or unreviewed generated PR titles.

After these checks, `Release Accepted Artifact to Production` enters native protected `production` Environment and requires independent reviewer approval. Only **then** the restricted runner resolves Environment-scoped credentials. `scripts/release/promote-stable.sh` independently verifies current main, explicit workflow identity, the chosen promotion PR's independent current-head approval and merge ancestry, accepted UAT comment ownership/timestamp, signed RC tag/digest, SBOM/provenance and no drift in shipped Website inputs. The requested `vX.Y.Z` **must** match the stable version derived from its accepted `vX.Y.Z-rc.N`; the workflow cannot silently release a different candidate.

The previously reviewed `scripts/release/deploy-release.sh` reconciles the configured protected production target after pinned SSH, rollback/receipt/health/edge checks. If the accepted immutable digest is already healthy on that exact target, redundant deployment is skipped; otherwise the **same signed RC digest** is deployed and verified with the reviewed adapter. No rebuild, registry retag, modified image bits or automatic provider edge change is allowed. **Only after successful target verification/reconciliation** does the job publish the previously reviewed **user-friendly release notes** for stable GitHub Release `vX.Y.Z`, appending a separate Technical Evidence section containing accepted digest, exact RC source, promotion PR, Human UAT URL and production run reference. A stable release tag is not an RC tag; the signed OCI _build_ identity and existing static footer may still retain the original RC build version as immutable provenance.

The native Environment reviewer approves **execution of this explicit release request**, not routine source merges. The retired `KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED` setting is no longer consumed by the active release workflow; toggling it cannot request a release. Staging's separate `KAORI_WEBSITE_AUTO_STAGING_ENABLED` remains default-off unless independently authorized. A missing UAT comment, unrelated PR, source drift, incorrect digest or missing runtime proof fails closed. Manual production dispatch is **not** exercised as part of source implementation/CI tests.

### Activation and migration guard

**2026-11-17 exact candidate checkpoint:** signed `v0.1.2-rc.10` is
already published, deployed to the sole public Website slot and
**explicitly Human Accepted** by the maintainer, recorded at
[Website #202](https://github.com/OXY7O/kaori-website/issues/202#issuecomment-6939870730).
The actual public Inter OFL-1.1 and Lucide/Feather ISC+MIT notices were
byte-verified on the exact live RC.10 OCI by the authorized host operator;
remediation issues [#190](https://github.com/OXY7O/kaori-website/issues/190)
and [#192](https://github.com/OXY7O/kaori-website/issues/192) are CLOSED.
Later staging merges #209 and #207 only changed source governance/runbooks;
the signed RC.10 digest and Human UAT do **not** need to be repeated. Promotion
still requires this issue's #210 reviewed lineage correction, an independently
reviewed `kaori/staging` → `main` PR, verified existing public immutable rollback
receipt, actual protected production Environment reviewer gate, and scoped
publication operations decision [KAORI #4939](https://github.com/OXY7O/KAORI/issues/4939).
**Historical Docs dependency reconciliation (#119 → #201/#203):**
[#119](https://github.com/OXY7O/kaori-website/issues/119) documented an
older Website automation sequencing rule dependent on Docs #38/#39/#40/#43/#45
and an older deployment topology. The later maintainer-approved
[Website #201](https://github.com/OXY7O/kaori-website/issues/201) and
[implementation #203](https://github.com/OXY7O/kaori-website/issues/203)
supersede that architecture with **two GitHub Environments**,
**one Website public slot**, and **immutable same-digest stable metadata only**.
The Website stable publisher does not create, promote or deploy a Docs release.
The Docs workstream remains independently OPEN (latest observed signed Docs
prerelease `v0.3.0-rc.8`, not an accepted stable Docs release); never claim its
UAT or production requirements are complete. The Website stable verification
still requires `docs.kaori.cloud` HTTPS readiness and must never mutate Docs.
This reconciliation removes an obsolete **cross-repository ordering barrier**,
not the actual Website rights, production Environment, rollback or staging-to-main
review gates. Future new automatic RC publication remains OFF/NO-GO under
[KAORI #4939](https://github.com/OXY7O/KAORI/issues/4939); broad source/brand
relicensing [KAORI #4212](https://github.com/OXY7O/KAORI/issues/4212)
remains a separate independent decision.
No approval or UAT of the already accepted RC.10 should be requested again.
Changing environment-scoped host configuration for a future dedicated server
does not change the release promotion semantics; authoritative DNS/TLS stays
with the existing shared-edge/provider operating procedure.

The stable release is **metadata promotion** and the live Website may still
display the original signed `-rc.N` build footer, intentionally preserving
the byte-identical artifact. Do not claim stable-source rebuild or a separate
runtime when there is none.
