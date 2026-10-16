# KAORI Website Server Deployment

## Boundaries

KAORI Website is an independent, static-only Docker Compose project. It shares a **physical target VPS** with KAORI Application **only after host capacity and trust are verified**. The website does not own any KAORI application directories, database, Redis, Celery, database migrations, metrics, or secrets.

Website application paths (proposed, not deployed):

- `/opt/kaori-website`: reviewed Compose and adapter scripts.
- `/var/lib/kaori-website/deploy-state`: mode-restricted release receipt and previous release pointer.
- Container project: `kaori-website`; internal upstream HTTP port **8080**, with **no host ports**.
- Edge DNS / Nginx / Certbot and host **80/443** remain owned by `/opt/shared-edge`, outside this repository.

Never modify `/opt/kaori`, `/etc/kaori`, `/var/lib/kaori`, the KAORI application Compose project or the preexisting `kaori.cloud` site registration to deploy the website.

The same versioned **application deployment protocol** as KAORI is used: exact accepted staging SHA → Full Admission → build once → immutable OCI image digest → dedicated host SSH trust boundary → health verification → UAT evidence → human acceptance → promotion of the same digest to production. A docker image build or Astro CI success alone is **not** website release acceptance.

## Container and development smoke

```bash
docker build --target production \
  --build-arg APP_BUILD_SHA="$(git rev-parse HEAD)" \
  --build-arg APP_VERSION="0.1.0-rc.1" \
  --build-arg APP_BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t kaori-website:local .

# Non-public, isolated smoke test. It must not attach to edge-public or host 80/443.
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh kaori-website:local \
  -c 'test "$(id -u)" != 0; nginx -t; test -s /usr/share/nginx/html/index.html'
```

Production image/Compose use an unprivileged server, health endpoint at `/healthz`, read-only root, limited process/memory/CPU budget and rotated logs. Static assets are built inside the Docker build and never require Node on the server. The website is a public informational site and never calls operational provider APIs from the browser.

## Predeployment prerequisites (not yet verified)

1. Review SSH identity and permissions for a **separate website deployment identity**. Follow KAORI's `kaori-deploy` trust practices; do not repurpose or overwrite its private key, registration or server runtime.
2. Confirm allocated CPU/memory, Docker resource limits and available container/registry storage. The shared VPS may also host the self-hosted CI runner.
3. Prepare the above app and state directories with restricted ownership; verify no naming/Compose project collision.
4. Review the DNS hostname to use. Do not assume or overwrite `kaori.cloud`.
5. Verify exact staging SHA, completed website Full Admission and immutable digest; ensure OCI labels match SHA and SemVer candidate.
6. Establish a separate protected GitHub Environment and SSH host-key pin for the website target. Never use a direct runner-to-localhost deployment shortcut.
7. A release candidate build should retain verified SBOM, vulnerability scan, provenance and signature evidence consistent with KAORI App policy. Those workflows are tracked in #4 and remain incomplete until implemented and executed.

## Server operation (once release authorized)

On the website deployment host, in a reviewed and permissioned location:

```bash
# Pre-provision /opt/kaori-website with the reviewed adapter files.
# Ensure /var/lib/kaori-website/deploy-state exists and is owned by approved deploy identity.
bash /opt/kaori-website/deploy.sh \
  'registry.example/kaori-website@sha256:<approved-digest>' \
  '<accepted-40-character-sha>' \
  'v0.1.0-rc.1'
```

The script rejects mutable tags, mismatched image labels, missing state or Compose files, and unhealthy containers. Active receipt is committed only after internal health passes. Static rollback uses the previous digest and version identity:

```bash
bash /opt/kaori-website/rollback.sh
```

Rollback is **not** a database restore because this is a stateless website. Preserve the previous image digest and prior receipt; follow the shared-edge runbook to reattach a replaced healthy web container.

## Public-edge publication is separate

Follow **`OXY7O/KAORI/example/shared-edge/README.md`** and **`docs/deployment/SHARED_EDGE_OPERATIONS.md`** with the **already installed** host scripts. Do not copy/reimplement Nginx/Certbot here or mutate `/opt/shared-edge` until the website container and DNS identity are approved.

Example *shape only*, run as an explicitly authorized shared-edge operator after the website container is healthy:

```bash
cd /opt/shared-edge/runtime
bash ./publish-container.sh \
  --site-id kaori-website \
  --domain '<approved-website-hostname>' \
  --container '<verified-website-web-container-id>' \
  --alias kaori-website-web \
  --port 8080 \
  --health-path /healthz \
  --tls true \
  --websocket false
bash ./apply.sh
```

Edge apply owns trusted DNS/TLS readiness, HSTS, host/SNI checks and certificate renewal. Re-run publication against the **new container** after a replacement because edge attachment is intentionally outside the website Compose lifecycle.

## UAT evidence

Collect the exact SHA, image digest, immutable OCI release metadata, application container ID and health result, edge registration, TLS/Host/SNI check result, browser desktop/tablet/mobile light/dark screenshots, keyboard/accessibility evidence, and the human acceptance decision. Do not close #5 or promote until required evidence is committed and approved.
