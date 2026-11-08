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

The Website is public, but external contribution acceptance remains **on hold** until
[KAORI rights #4212](https://github.com/OXY7O/KAORI/issues/4212) and
[community launch #4217](https://github.com/OXY7O/KAORI/issues/4217)
are approved. These instructions support maintainer-authorized fork tests and proposals only.
Public visibility does not grant copyright or branding redistribution rights.
Report vulnerabilities through [private reporting](https://github.com/OXY7O/kaori-website/security/advisories/new).

### Choose the correct source branch

- `upstream` means the official `OXY7O/kaori-website` repository.
- `origin` means your personal fork.
- `upstream/kaori/staging` is the starting point for every new proposal.
- `origin/main` is your fork's default branch and may contain old commits.
- `upstream/main` is the protected production baseline, not the contributor base.

A new branch name does not change its Git ancestry. To avoid merge conflicts,
create the branch from current upstream staging, not from the fork's `main`.

### Fork, fetch and create an isolated branch

Fork the [Website repository](https://github.com/OXY7O/kaori-website) on GitHub.
For the approved [#140](https://github.com/OXY7O/kaori-website/issues/140) test:

```bash
git clone https://github.com/YOUR_USERNAME/kaori-website.git
cd kaori-website
git remote -v
# Add upstream only if the remote is not already configured.
git remote add upstream https://github.com/OXY7O/kaori-website.git
git fetch upstream kaori/staging
git switch -c fork-test-140 upstream/kaori/staging
```

For accepted implementation work, name the branch using its governing issue,
for example `kaori/chore-123-update-readme`, from the same staging source.
Change only the approved files. A fork test needs only one harmless README edit.

Before opening the PR, confirm the diff has no inherited old commits:

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

Record a check as **NOT RUN** if it was not executed.

### Select the PR base and head on GitHub

Use **Compare across forks** and set:

- Base repository: `OXY7O/kaori-website`
- Base branch: `kaori/staging` (not `main`)
- Head repository: `YOUR_USERNAME/kaori-website`
- Compare branch: `fork-test-140` or your accepted issue-linked branch

Reference the governing issue and use the existing [PR template](../.github/PULL_REQUEST_TEMPLATE.md).
Do not merge a disposable test PR.

### Understand the security checks

- `Community Fork Check` runs untrusted code on a read-only GitHub-hosted runner.
  It provides format, typecheck and build feedback without access to secrets or hosts.
- Trusted `Developer Check / Route Checks` must fail before checkout for an
  external fork. Dependent trusted and privileged jobs must be skipped.
  The deliberate failure is expected and must not be bypassed.
- GitHub may require maintainer approval before first-time contributor checks run.
  An `Action required` or pending status is not a PASS.
- Maintainers alone may triage accepted proposals into an approved KAORI issue,
  reproduce the change in a trusted issue-linked branch, and complete Developer
  Check, staging Full Admission, UAT, human acceptance and governed promotion.

### Fix a conflicting fork PR

If GitHub reports `mergeable_state=dirty`, a fork branch may contain old
`main` history even if only README changed. Do not force-push, run
`git reset --hard`, bypass required checks or modify the protected base.
For a disposable test, close the conflicted PR without merging and start fresh:

```bash
git fetch upstream kaori/staging
git switch -c fork-test-140-v2 upstream/kaori/staging
# Reapply only the approved harmless README edit.
git add README.md
git commit -m "docs: verify isolated fork feedback #140"
git diff --check
git log --oneline upstream/kaori/staging..HEAD
git push -u origin fork-test-140-v2
```

Open a new fork PR targeting `kaori/staging`. For legitimate existing work,
consult a maintainer to replay only approved commits without losing local changes.

The shared [OXY7O contributor policy](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md)
remains the fallback. Website [delivery](DELIVERY.md) and [CI/CD](CI_CD.md)
rules take precedence for branch, review, admission and release.

## Browser quality candidate (#58)

Browser execution uses pinned Playwright/axe dependencies and `npm run test:browser` after `npm run build`. The CI Full Admission workflow records screenshots, axe results, traces, and lab-only performance evidence; see `docs/BROWSER_QA.md`. This does not replace human acceptance or field INP/Core Web Vitals. The DevContainer needs an explicitly installed Chromium browser; browser dependencies are **not** included in the runtime website Docker image.
