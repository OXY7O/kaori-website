# Server deployment boundary (planned, issue #5)

The target host is shared with the KAORI application, but the website remains a separate Docker Compose application and release transaction.

- Independent host/config/state names and deploy identity must be reviewed against the live server before rollout.
- Use a digest-qualified image, exact source SHA, a healthcheck and explicit rollback reference.
- Keep the static web container **off public host ports 80 and 443**.
- Reuse the existing separately managed shared edge under `/opt/shared-edge` and its `edge-public` attachment/publication workflow.
- Existing Nginx/Certbot, DNS, TLS and public 80/443 belong to the shared-edge lifecycle, not this repository.
- Do not mutate `/opt/kaori`, `/etc/kaori`, `/var/lib/kaori` or the KAORI application's Docker Compose project.
- Do not infer website readiness from an application workflow run. Verify actual static response, TLS, host/SNI safety, container health and light/dark rendering.
- Public availability is distinct from website container deployment success; independently repair edge publication without triggering a new application build.

See `OXY7O/KAORI/docs/deployment/SHARED_EDGE_OPERATIONS.md` and `example/shared-edge/README.md` for the canonical shared-edge runbook. This document must be expanded with verified host identity, internal port, service alias, UAT DNS and rollback evidence before actual deployment.
