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
