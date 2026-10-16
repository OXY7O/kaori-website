# KAORI Website

Official public product website for **KAORI — Knowledge, Automation, Operations, Resilience & Intelligence**.

This repository is **not** the KAORI operational application. Product claims, UI identity and capability maturity inherit authority from [OXY7O/KAORI](https://github.com/OXY7O/KAORI), especially \`docs/product/README.md\` and \`docs/design/KAORI_DESIGN_SYSTEM.md\`. The website remains a static Astro site; no provider credentials, live operational data or runtime backend are included.

## Stack

Astro (static output), TypeScript, Tailwind CSS v4, Inter, and KAORI Violet. Development uses Docker Compose and a VS Code DevContainer. Production is planned as an independent, immutable static-image container behind the existing shared-edge Nginx/Certbot lifecycle.

## Quick start

1. Open the repository in **VS Code → Dev Containers: Reopen in Container**.
2. Wait for \`postCreateCommand\` to complete \`npm ci\`.
3. Run \`npm run dev\` and visit http://localhost:4321.
4. Run \`npm run check\`, \`npm run build\`, and \`npm run check-format\` for local checks.

Without a DevContainer, use Node.js 22 and npm 10, then run \`npm ci && npm run dev\`.

## Governance

Workflow: Issue → issue-scoped branch from \`kaori/staging\` → Draft PR → Developer Check → reviewed merge to \`kaori/staging\` → Full Admission → UAT/human acceptance → promotion PR from \`kaori/staging\` to \`main\` → release.

Do not direct-commit product code to \`main\`. \`main\` holds the seed history until an accepted staging promotion. Do not promote arbitrary work branches. Issue #1 is the foundation umbrella; #2 is DevContainer/governance, #3 is Home UI, #4 is CI/CD and #5 is isolated deployment.

## References

- [Development guide](docs/DEVELOPMENT.md)
- [Website architecture and design](docs/ARCHITECTURE.md)
- [Delivery workflow](docs/DELIVERY.md)
- [Server deployment boundary](docs/DEPLOYMENT.md)

KAORI is currently an **internal-use proprietary project**; do not present it as an open-source download.
