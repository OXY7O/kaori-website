# KAORI Website CI/CD

**Authority:** This website follows `OXY7O/KAORI/docs/engineering/KAORI_DELIVERY_WORKFLOW.md` and `docs/setup/GITHUB_ACTIONS_CI_CD.md`, with domain-appropriate website validation.

## Runner ownership

Use the same **physical or organization runner pool** as KAORI, without replacing the existing registration or weakening host isolation:

| Stage | Required runner labels |
| --- | --- |
| Developer Check / routing | `self-hosted,linux,x64,platform-ci` |
| Staging Full Admission | `self-hosted,linux,x64,kaori-ci` |
| Release/UAT control-plane | `self-hosted,linux,x64,platform-ci` |

**Important:** A runner registered exclusively for the `OXY7O/KAORI` repository will *not* execute workflows from `OXY7O/kaori-website` merely because the labels match. The operator must grant the new repo access via an appropriately scoped **organization runner or runner group** (or an additional independent registration, if approved). Runner registration and groups are external operational authority and must be inspected before CI is counted as PASS. Do not deregister or repurpose KAORI's working runner in order to enable this repository.

Temporary UAT co-location with the deployment VPS retains the SSH trust boundary; no direct container deployment is made from the runner's local Docker daemon into the application namespace.

## Gate contracts

1. **Issue → work branch:** canonical branch `kaori/<type>-<issue>-<slug>`, source from current `kaori/staging`.
2. **Developer Check:** a PR targeting `kaori/staging` validates same-repository and issue-linked branch; `git diff --check` always runs. Website-impact paths run locked install, Astro check and static build; dependency authority changes additionally run high-severity npm audit. Docs-only edits do not rebuild/deploy.
3. **Review:** an approved review, exact-head green Developer Check and resolved findings are required before merge. Work branch builds are not Full Admission.
4. **Staging Full Admission:** on exact merged `kaori/staging` commit, checks formatting, TypeScript/Astro, dependencies, production build and static output. No work-branch Full Admission. Browser Visual QA, Docker/DAST and security release evidence remain *separate required release criteria* until implementation is completed under #3/#5. A green static validation is never sufficient to claim full release readiness.
5. **UAT release candidate:** use reviewed exact SHA and immutable OCI digest; independently verify rendered website, light/dark and mobile behavior, accessibility and deployed TLS.
6. **Human acceptance → promotion PR:** only `kaori/staging` may target `main`; do not accept direct work-branch-to-main PRs. Stable release uses the admitted image digest without rebuilding application bits.

## External protection configuration

Branch rulesets, required reviewers, signature policy, GitHub Environment permission, runner group sharing, GitHub Project custom fields and native relationship metadata must be configured through GitHub UI when the connector does not support their mutation. **A YAML check cannot substitute for server-enforced branch protection.**

Full admission checks must not be weakened or renamed to hide failures. Before marking it PASS, ensure that every relevant browser, artifact, security, runtime, and rollout check for the current scope has executed. An incomplete gate is a **BLOCK** for release, even when basic build checks pass.

## Source state

Until PR #6 and PR #7 have completed human review, #4 is a separate issue-backed *stacked* candidate and must not merge to staging ahead of its dependencies. Once the base is admitted, inspect the diff relative to current staging, preserve exact-SHA evidence and follow staging Full Admission.
