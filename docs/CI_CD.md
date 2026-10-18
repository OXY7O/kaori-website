# KAORI Website CI/CD

**Authority:** This website follows `OXY7O/KAORI/docs/engineering/KAORI_DELIVERY_WORKFLOW.md` and `docs/setup/GITHUB_ACTIONS_CI_CD.md`, with domain-appropriate website validation.

## Runner ownership

Use the same **physical or organization runner pool** as KAORI, without replacing the existing registration or weakening host isolation:

| Stage                     | Required runner labels              |
| ------------------------- | ----------------------------------- |
| Developer Check / routing | `self-hosted,linux,x64,platform-ci` |
| Staging Full Admission    | `self-hosted,linux,x64,kaori-ci`    |
| Release control-plane     | `self-hosted,linux,x64,platform-ci` |

**Important:** A runner registered exclusively for the `OXY7O/KAORI` repository will _not_ execute workflows from `OXY7O/kaori-website` merely because the labels match. The operator must grant the new repo access via an appropriately scoped **organization runner or runner group** (or an additional independent registration, if approved). Runner registration and groups are external operational authority and must be inspected before CI is counted as PASS. Do not deregister or repurpose KAORI's working runner in order to enable this repository.

Temporary release runner co-location with the deployment VPS retains the SSH trust boundary; no direct container deployment is made from the runner's local Docker daemon into the application namespace.

## Gate contracts

1. **Issue → work branch:** canonical branch `kaori/<type>-<issue>-<slug>`, source from current `kaori/staging`.
2. **Developer Check:** a PR targeting `kaori/staging` validates same-repository and issue-linked branch; `git diff --check` always runs. Website-impact paths run locked install, Astro check and static build; dependency authority changes additionally run high-severity npm audit. Docs-only edits do not rebuild/deploy.
3. **Review:** an approved review, exact-head green Developer Check and resolved findings are required before merge. Work branch builds are not Full Admission.
4. **Staging Full Admission:** on exact merged `kaori/staging` commit, checks formatting, TypeScript/Astro, dependencies, production build and static output. No work-branch Full Admission. Docker Runtime Admission now runs on admitted staging; actual browser Visual QA, deployed HTTPS/TLS, hostname authority and human acceptance are still separate release gates. A green static validation is never sufficient to claim full release readiness.
5. **Release candidate:** use reviewed exact SHA and immutable OCI digest; independently verify rendered website, light/dark and mobile behavior, accessibility and deployed TLS.
6. **Human acceptance → promotion PR:** only `kaori/staging` may target `main`; do not accept direct work-branch-to-main PRs. Stable release uses the admitted image digest without rebuilding application bits.

## External protection configuration

**Approved temporary exception (private GitHub Free organization):** protected branches/rulesets and protected GitHub Environments are not enforced under the current plan. Use issue-linked Draft PRs, a recorded manual reviewer decision, exact-SHA Developer Check, staging admission, and explicit release verification and human acceptance. This is a compensating **procedure**, not equivalent enforcement. Do not claim protection is enabled; revisit enforcement if the plan changes.

Use **repository-level** Actions Variables and Secrets for this private repository; organization-level and environment-level secrets/variables must not be relied on. The Developer Check and Full Admission require no custom credentials. The canonical `publish-staging-image.yml` RC publisher and `deploy-staging-host.yml` release deployment use repository-scoped registry and SSH credentials with explicit operator authority and an admitted exact staging SHA. These are **manual** release operations and must not be turned into unconditional push-to-deploy behavior. Both were authored on staging, and the default-branch dispatch limitation is documented below.

Runner access, GitHub Project custom fields, native relationships, and review metadata still require GitHub-side setup where connector capabilities are absent. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state

The current public website serves signed [v0.1.0-rc.6](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.6) from exact staging source `b8ccb60f0c208b7f8de268f459eacbb309e6f24a`, immutable digest `sha256:f43635107bd541c173a059ddebbb70d36d2677494c2084ebb821d6dde4a699cc`. The [Full Admission and Docker Runtime Admission](https://github.com/OXY7O/kaori-website/actions/runs/39098822528), plus [signed RC.6 release and SSH public-edge verification](https://github.com/OXY7O/kaori-website/actions/runs/39098822357) **PASS** after a fail-closed admission-wait retry. Reviewed [PR #42](https://github.com/OXY7O/kaori-website/pull/42) contains the approved KAORI Hero artwork and ecosystem copy. Previous signed RC.5 remains immutable rollback authority. The workflow retirement change **is not** part of the deployed RC.6 image. `main` remains on HOLD pending browser Visual QA and explicit human acceptance.

## Canonical Release Workflows

| Workflow                    | Trigger                                                          | Responsibility                                                                                                             |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `developer-check.yml`       | Issue-linked PR → `kaori/staging`                                | Path-aware Route Checks, targeted Astro/format/build, optional Docker/Trivy and registry preflight.                        |
| `quality.yml`               | Staging/main push, promotion PR, manual admission when available | Full Admission (format, typecheck, npm audit, static build) **and Docker Runtime Admission**; no deployment.               |
| `publish-staging-image.yml` | Explicit RC manual dispatch                                      | Exact admitted staging SHA, immutable image, Trivy HIGH/CRITICAL, SBOM/provenance, keyless signature and release evidence. |
| `deploy-staging-host.yml`   | Explicit release deployment dispatch                             | Pin SSH trust, validate signed RC/digest and approval reference; deploy only the standalone website.                       |

**Retired release bootstrap automation:** One-time private image, port diagnosis, ingress repair and RC.2/RC.4/RC.5/RC.6 staging activation workflows were retired under #20 after exact-source execution. Historical Actions evidence remains in #10, #15, #21, #27, #30, #38 and #43. The supported workflow surface is the **four canonical workflows** shown above; no automatic staging push release/deploy pipeline remains.

GitHub `workflow_dispatch` requires the workflow on the **default branch**. The website `main` remains an initial seed until explicit human acceptance, so the canonical manual publisher and deployer cannot yet be dispatched normally. **Do not promote unaccepted code to main merely to enable dispatch.** Any future issue-authorized, one-time staging activation requires new review authority, exact-merge Full Admission, signed immutable artifacts and removal after use. No permanent auto-deploy trigger is allowed.

## Release boundary and edge acceptance

`https://kaori.cloud` **now serves KAORI Website**, independently of `https://app.kaori.cloud` (KAORI Application) and `https://auto.kaori.cloud` (n8n). The operator initially cut over the apex under #21. For RC.6, the existing-edge registration preflight and post-redeploy attachment passed, followed by HTTPS `/healthz` for the website, application readiness, and n8n readiness on the accepted immutable digest. The private `127.0.0.1:18080` loopback binding also passed; public HTTPS health is separate. Real browser light/dark/mobile/accessibility verification and explicit human design acceptance are still required before `main` promotion.

Use only the existing KAORI shared-edge scripts and host-side DNS/TLS readiness/rollback runbook. Collect apex-vs-app routing, HTTPS certificate, Host/SNI negative checks, n8n unaffected, visual/accessibility and explicit human acceptance before promotion. Every public edge cutover is reviewed separately from the website container release.
