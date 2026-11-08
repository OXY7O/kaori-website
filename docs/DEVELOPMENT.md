# Development and DevContainer

The DevContainer uses a dedicated Docker Compose project (`kaori-website-dev`), the Node.js 22 toolchain matching the KAORI application frontend baseline, and a separate local Astro port (`4321`). No PostgreSQL, Redis, Celery, Kubernetes provider, or external operational secret is needed.

## VS Code

Open **Dev Containers: Reopen in Container**. The container runs as user `node`, stores `node_modules` in a dedicated Docker volume and forwards port `4321`. The post-create command uses `npm ci`, which must use the committed lockfile.

From the integrated terminal:

```bash
npm run dev
npm run check
npm run build
npm run check-format
```

The approved editorial Home Page was integrated into staging under issue #3. Browser/light-dark/mobile verification and human acceptance remain independent release requirements.

## Docker CLI (dev)

```bash
docker compose -f compose.dev.yml up -d --build
docker compose -f compose.dev.yml exec workspace npm ci
docker compose -f compose.dev.yml exec workspace npm run dev
```

The DevContainer and this CLI use the same Compose project. Stop it with `docker compose -f compose.dev.yml down`. Do not use `down -v` unless deliberately discarding local dependencies.

## Runtime and security

Development ports bind to loopback only. Do not copy secrets from the KAORI application. Do not rely on remote CDNs for site runtime assets. The static hosting and immutable deployment adapter are tracked separately under issue #5.

## Validation boundaries

Developer checks are targeted to the work branch. Full Admission, browser Visual QA, staging deployment and human acceptance are separate evidence-producing stages; source inspection alone is not a PASS.

## External fork PRs — controlled pre-launch procedure

**Status and authority:** The Website is public, but there is no approved public open-source license or general invitation to merge external code. The [KAORI rights audit](https://github.com/OXY7O/KAORI/issues/4212) and [community launch decision](https://github.com/OXY7O/KAORI/issues/4217) remain open. The steps below support **maintainer-authorized, disposable contribution tests** and explain the proposal route; they do not grant redistribution rights or release authority. Never include credentials, private endpoints, internal screenshots, or third-party material without permission. Use [private vulnerability reporting](https://github.com/OXY7O/kaori-website/security/advisories/new) rather than a public PR for security disclosures.

### Understand the four branches before starting

- `upstream/main`: protected production and release baseline owned by `OXY7O/kaori-website`; **not** the starting point for a contributor change.
- `upstream/kaori/staging`: current official integration baseline; **start new work here**.
- `origin/main`: default branch of your fork; it can lag staging and produce conflicts.
- `origin/fork-test-140`: disposable example work branch in your fork, based on the upstream staging commit.

`origin` points to **your fork**; `upstream` points to the **OXY7O repository**. Creating a new branch *name* from stale `origin/main` does **not** give it staging's history.

### Create a clean fork branch from the correct source

Fork [OXY7O/kaori-website](https://github.com/OXY7O/kaori-website) in GitHub under your own account. For a maintainer-authorized [#140](https://github.com/OXY7O/kaori-website/issues/140) isolation rehearsal, run:

```bash
git clone https://github.com/YOUR_USERNAME/kaori-website.git
cd kaori-website
git remote -v
# Run the next command only if an "upstream" remote does not already exist.
git remote add upstream https://github.com/OXY7O/kaori-website.git
git fetch upstream kaori/staging
git switch -c fork-test-140 upstream/kaori/staging
```

For an accepted real implementation, use the approved issue and a descriptive branch such as `kaori/chore-123-update-readme`, also created from `upstream/kaori/staging`. Do not commit directly to `origin/main` or `upstream/main`. Only update files within your approved or test scope; a safe isolation test edits a single non-sensitive README line.

Before pushing, verify the branch lineage and inspect **only your intended commits and files**:

```bash
git diff --check
git log --oneline upstream/kaori/staging..HEAD
git diff --stat upstream/kaori/staging...HEAD
npm ci --ignore-scripts --no-audit --no-fund
npm run check-format
npm run check
npm run build
git push -u origin fork-test-140
```

For a new test PR, the commit list should contain your own bounded change, not unrelated commits inherited from the fork's old `main`. Record any check not actually executed as **NOT RUN** rather than PASS.

### Open the PR with the correct GitHub base and head

Use **Compare across forks** when GitHub's default proposal points to the wrong branch. Set:

- **Base repository:** `OXY7O/kaori-website`
- **Base branch:** `kaori/staging` (**not `main`**)
- **Head repository:** `YOUR_USERNAME/kaori-website`
- **Compare branch:** `fork-test-140` (or the accepted issue-linked branch)

The PR should identify the governing issue, one clear change, validation actually executed, and known risks using the existing [PR template](../.github/PULL_REQUEST_TEMPLATE.md). A fork test PR is **not for merging**; the maintainer closes it after retaining evidence.

### What GitHub checks mean

- `Community Fork Check / Untrusted Fork Validation` may run the exact external fork SHA on an ephemeral `ubuntu-24.04` worker with read-only permissions and no shared cache, SSH or deployment credentials. It provides **feedback only**.
- `Developer Check / Route Checks` must **reject an external repository before checkout**; dependent trusted `Website Validation`, `Container Validation` and `Release Configuration` are not available to untrusted fork code. This deliberate red required check is not a reason to bypass the policy.
- GitHub may show **Action required** for a first-time contributor. A maintainer must evaluate/approve only an authorized, safe hosted workflow run; that status alone is **not** a test PASS.
- Maintainers review/triage the proposal into an accepted KAORI issue, reproduce approved changes on a trusted issue-linked work branch, obtain independent review, and complete existing Developer Check → staging Full Admission → relevant UAT → human acceptance → governed `kaori/staging` → `main` promotion. No fork PR can directly publish a release.

### Recover from a merge conflict without rewriting history

A fork branched from its old `main` can show `mergeable_state=dirty` even when GitHub displays only a README change. **Do not** force-push, use `git reset --hard`, merge directly into protected branches, or disable required checks to fix it. For a disposable PR, close the conflicted PR **without merge**, fetch current upstream staging, and start a fresh branch:

```bash
git fetch upstream kaori/staging
git switch -c fork-test-140-v2 upstream/kaori/staging
# Reapply only the approved, harmless README change.
git add README.md
git commit -m "docs: verify isolated fork feedback #140"
git diff --check
git log --oneline upstream/kaori/staging..HEAD
git push -u origin fork-test-140-v2
```

Open a **new** PR from `fork-test-140-v2` to `kaori/staging`. Confirm GitHub reports no conflicts. If the contributor has legitimate changes to preserve beyond a disposable test, coordinate a reviewed manual reapplication/cherry-pick of **only** the accepted commits; do not discard uncommitted work or alter the base branch.

The general organization contributor policy remains [OXY7O/.github/CONTRIBUTING.md](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md); Website-local [delivery](DELIVERY.md) and [CI/CD](CI_CD.md) standards take precedence for source/review/admission rules.

## Browser quality candidate (#58)

Browser execution uses pinned Playwright/axe dependencies and `npm run test:browser` after `npm run build`. The CI Full Admission workflow records screenshots, axe results, traces, and lab-only performance evidence; see `docs/BROWSER_QA.md`. This does not replace human acceptance or field INP/Core Web Vitals. The DevContainer needs an explicitly installed Chromium browser; browser dependencies are **not** included in the runtime website Docker image.
