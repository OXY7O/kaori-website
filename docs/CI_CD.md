# KAORI Website CI/CD

**Authority:** This website follows `OXY7O/KAORI/docs/engineering/KAORI_DELIVERY_WORKFLOW.md` and `docs/setup/GITHUB_ACTIONS_CI_CD.md`, with domain-appropriate website validation.

## Runner ownership

Use the same **physical or organization runner pool** as KAORI, without replacing the existing registration or weakening host isolation:

| Stage                     | Required runner labels              |
| ------------------------- | ----------------------------------- |
| Developer Check / routing | `self-hosted,linux,x64,platform-ci` |
| Staging Full Admission    | `self-hosted,linux,x64,kaori-ci`    |
| Release control-plane | `self-hosted,linux,x64,platform-ci` |

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

**Approved temporary exception (private GitHub Free organization):** protected branches/rulesets and protected GitHub Environments are not enforced under the current plan. Use issue-linked Draft PRs, a recorded manual reviewer decision, exact-SHA Developer Check, staging admission, and explicit human release verification/release acceptance. This is a compensating **procedure**, not equivalent enforcement. Do not claim protection is enabled; revisit enforcement if the plan changes.

Use **repository-level** Actions Variables and Secrets for this private repository; organization-level and environment-level secrets/variables must not be relied on. The Developer Check and Full Admission require no custom credentials. The canonical `publish-staging-image.yml` RC publisher and `deploy-staging-host.yml` release deployment use repository-scoped registry and SSH credentials with explicit operator authority and an admitted exact staging SHA. These are **manual** release operations and must not be turned into unconditional push-to-deploy behavior. Both were authored on staging, and the default-branch dispatch limitation is documented below.

Runner access, GitHub Project custom fields, native relationships, and review metadata still require GitHub-side setup where connector capabilities are absent. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state

The foundation, Home Page, CI/CD, container adapter and private ingress fixes were integrated in reviewed staging PRs #6–#17. The signed v0.1.0-rc.1 website candidate remains the last deployed **private** release verification artifact; it must not be treated as the current staging-source image after subsequent merges. A source change (such as website/app domain routing PR #19) requires a new exact-SHA Full Admission and immutable candidate before deployment. Public-edge publication at `kaori.cloud` remains a separate, reviewable release publication operation under #21; `app.kaori.cloud` remains the application (authority OXY7O/KAORI#2210).

## Canonical Release Workflows

| Workflow                    | Trigger                                                          | Responsibility                                                                                                             |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `developer-check.yml`       | Issue-linked PR → `kaori/staging`                                | Path-aware Route Checks, targeted Astro/format/build, optional Docker/Trivy and registry preflight.                        |
| `quality.yml`               | Staging/main push, promotion PR, manual admission when available | Full Admission (format, typecheck, npm audit, static build) **and Docker Runtime Admission**; no deployment.               |
| `publish-staging-image.yml` | Explicit RC manual dispatch                                      | Exact admitted staging SHA, immutable image, Trivy HIGH/CRITICAL, SBOM/provenance, keyless signature and release evidence. |
| `deploy-staging-host.yml`   | Explicit release verification manual dispatch                                     | Pin SSH trust, validate signed RC/digest and approval reference; deploy only the standalone website.                       |

**Retired release bootstrap automation:** The prior single-use activation, private-port diagnosis, and ingress repair workflows/scripts were removed under #20. Their execution evidence remains linked to issues #10 and #15. These temporary staging triggers are not a supported release mechanism and must not be reactivated.

GitHub `workflow_dispatch` requires the workflow on the **default branch**. Because the current `main` is still an initial seed pending human release acceptance, the two canonical manual workflows can be reviewed on staging but cannot be dispatched normally yet. **Do not promote unaccepted website code to main just to enable the button.** Public website release verification publication requires a _separate reviewed and one-time issue-authorized staging execution adapter_ until approved promotion makes manual dispatch available. It must be removed after use and preserve SHA, OCI, edge and human approval gates.

## Release boundary and edge acceptance

`https://kaori.cloud` belongs to KAORI Website; `https://app.kaori.cloud` belongs to KAORI Application; `https://auto.kaori.cloud` is unrelated automation. Domain authority does **not** mean live DNS/TLS cutover has happened. The website's currently working `127.0.0.1:18080` SSH-tunnel release verification proves only private host readiness, not public website publication.

Use only the existing KAORI shared-edge scripts and host-side DNS/TLS readiness/rollback runbook. Collect apex-vs-app routing, HTTPS certificate, Host/SNI negative checks, n8n unaffected, visual/accessibility and explicit human acceptance before promotion. Every public edge cutover is reviewed separately from the website container release.
