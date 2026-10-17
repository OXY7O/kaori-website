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

The foundation, Home Page, CI/CD, container adapter and private ingress fixes were integrated through reviewed staging PRs #6–#17. Release candidate `v0.1.0-rc.2` is the **currently published website artifact**, built from staging SHA `3d2590c3d8bca206d3d3333ee3d8b21ba4cb2da4` at OCI digest `sha256:c26e7ffd85603c22f7b48c6e3fc20d52c83dc13a3c0a54a07dafd0f65a4df2c9`. Its [exact-SHA Full Admission and Docker Runtime Admission](https://github.com/OXY7O/kaori-website/actions/runs/38992182267) and [signed immutable release / private deployment](https://github.com/OXY7O/kaori-website/actions/runs/38992182351) passed. The operator separately published `https://kaori.cloud` via the existing shared edge on 2026-10-17; all three domain DNS, HTTPS redirect, trusted TLS, health, unknown Host/SNI rejection and Certbot renewal dry-run passed. `app.kaori.cloud` remains the authenticated KAORI application; `auto.kaori.cloud` remains n8n. **Browser visual/accessibility verification, design human acceptance and governed main promotion remain separate work under #3.** Do not confuse the newer documentation-only staging SHA with the immutable deployed RC.2 source.

## Canonical Release Workflows

| Workflow                    | Trigger                                                          | Responsibility                                                                                                             |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `developer-check.yml`       | Issue-linked PR → `kaori/staging`                                | Path-aware Route Checks, targeted Astro/format/build, optional Docker/Trivy and registry preflight.                        |
| `quality.yml`               | Staging/main push, promotion PR, manual admission when available | Full Admission (format, typecheck, npm audit, static build) **and Docker Runtime Admission**; no deployment.               |
| `publish-staging-image.yml` | Explicit RC manual dispatch                                      | Exact admitted staging SHA, immutable image, Trivy HIGH/CRITICAL, SBOM/provenance, keyless signature and release evidence. |
| `deploy-staging-host.yml`   | Explicit release deployment dispatch                             | Pin SSH trust, validate signed RC/digest and approval reference; deploy only the standalone website.                       |

**Retired release bootstrap automation:** The prior single-use activation, private-port diagnosis, and ingress repair workflows/scripts were removed under #20. The final issue #21 one-time RC.2 activation also ran successfully and was retired under #20 after its exact-source execution. Historical evidence remains in issues #10, #15 and #21. No one-time staging-to-release workflow remains in the canonical four-workflow surface.

GitHub `workflow_dispatch` requires the workflow on the **default branch**. Because the current `main` is still an initial seed pending human release acceptance, the two canonical manual release workflows are staged but cannot be dispatched normally yet. **Do not promote unaccepted website code to main just to enable the button.** The issue #21 one-time, issue-authorized activation was executed and then retired. Future exceptional activation requires its own issue and review, never an always-on staging release trigger. After human acceptance, promote only `kaori/staging` → `main` and preserve the accepted immutable digest rather than rebuilding production bytes.

## Release boundary and edge acceptance

`https://kaori.cloud` belongs to KAORI Website; `https://app.kaori.cloud` belongs to KAORI Application; `https://auto.kaori.cloud` remains separate automation. On 2026-10-17 the operator confirmed the **public** apex serves the KAORI Website at the RC.2 digest, and the installed shared edge passed DNS, HTTPS redirect, TLS, three-domain health, unknown Host/SNI rejection and all three certificate renewal dry-runs. The separate `127.0.0.1:18080` loopback binding remains private; neither it nor successful edge verification substitutes for browser visual QA and human design acceptance.

Use only the existing KAORI shared-edge scripts and host-side DNS/TLS readiness/rollback runbook. Collect apex-vs-app routing, HTTPS certificate, Host/SNI negative checks, n8n unaffected, visual/accessibility and explicit human acceptance before promotion. Every public edge cutover is reviewed separately from the website container release.
