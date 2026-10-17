# KAORI Website Server Deployment

## Boundaries

KAORI Website is an independent, static-only Docker Compose project. It shares a **physical target VPS** with KAORI Application **only after host capacity and trust are verified**. The website does not own any KAORI application directories, database, Redis, Celery, database migrations, metrics, or secrets.

Website application paths (existing deployment layout):

- `/opt/kaori-website`: reviewed Compose and adapter scripts.
- `/var/lib/kaori-website/deploy-state`: mode-restricted release receipt and previous release pointer.
- Container project: `kaori-website`; internal upstream HTTP port **8080**, with **no host ports**.
- Edge DNS / Nginx / Certbot and host **80/443** remain owned by `/opt/shared-edge`, outside this repository.

Never modify `/opt/kaori`, `/etc/kaori`, `/var/lib/kaori`, the KAORI application Compose project or the existing shared-edge registrations for `kaori.cloud` or `app.kaori.cloud` to deploy the website.

The same versioned **application deployment protocol** as KAORI is used: exact accepted staging SHA â Full Admission â build once â immutable OCI image digest â dedicated host SSH trust boundary â health verification â release verification evidence â human acceptance â promotion of the same digest to production. A docker image build or Astro CI success alone is **not** website release acceptance.

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

## Predeployment prerequisites (verify for each release)

1. Review SSH identity and permissions for a **separate website deployment identity**. Follow KAORI's `kaori-deploy` trust practices; do not repurpose or overwrite its private key, registration or server runtime.
2. Confirm allocated CPU/memory, Docker resource limits and available container/registry storage. The shared VPS may also host the self-hosted CI runner.
3. Prepare the above app and state directories with restricted ownership; verify no naming/Compose project collision.
4. Confirm the approved hostname split: `kaori.cloud` serves the website; `app.kaori.cloud` serves KAORI Application. Verify current edge registrations and obtain cutover authority before changing the apex.
5. Verify exact staging SHA, completed website Full Admission and immutable digest; ensure OCI labels match SHA and SemVer candidate.
6. With GitHub Free/private, use repository-level Actions secrets/variables and an explicit manual release deployment authorization record; protected GitHub Environments and environment-level secrets are not available. Pin the website target's SSH host key. Never use a direct runner-to-localhost deployment shortcut.
7. Every release candidate retains verified SBOM, Trivy HIGH/CRITICAL results, provenance, signing and immutable registry identity before deployment; successful earlier release evidence does not transfer to a new SHA.

## Repository Actions configuration

Repository-level keys are now wired into the manual-only release candidate publisher (#4) and release deployment workflow (#5) on issue-linked review branches. Credentials and admission must still be verified for each independent release; previous acceptance does not authorize a new publication. Provision them in `OXY7O/kaori-website` repository settings; do not assume organization-level or environment-level secrets will reach a private GitHub Free repository.

- Variables: `KAORI_WEBSITE_DOCKER_REGISTRY_HOST`, `KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE`, `KAORI_WEBSITE_HOST`, `KAORI_WEBSITE_HOST_PORT`, `KAORI_WEBSITE_HOST_USER`, `KAORI_WEBSITE_HOST_DEPLOY_ROOT`, `KAORI_WEBSITE_PUBLIC_DOMAIN`.
- Secrets: `KAORI_WEBSITE_DOCKER_REGISTRY_USERNAME`, `KAORI_WEBSITE_DOCKER_REGISTRY_PASSWORD`, `KAORI_WEBSITE_HOST_SSH_PRIVATE_KEY`, `KAORI_WEBSITE_HOST_SSH_PASSPHRASE` when the private key is encrypted, and `KAORI_WEBSITE_HOST_KNOWN_HOSTS` pinned out of band.

Reuse the KAORI Application's **registry host**, if appropriate, but not its image repository identity or runtime secrets. Use an independently scoped registry robot account and website deployment SSH identity. No database/API credentials are needed for static Astro output.

## Server operation (once release authorized)

On the website deployment host, using an approved deployment identity and immutable image:

```bash
# Pre-provision /opt/kaori-website with the reviewed adapter files.
# Ensure /var/lib/kaori-website/deploy-state exists and is owned by approved deploy identity.
bash /opt/kaori-website/deploy.sh \
  'registry.example/kaori-website@sha256:<approved-digest>' \
  '<accepted-40-character-sha>' \
  'v0.1.0-rc.1'
```

The script rejects mutable tags, mismatched image labels, missing state or Compose files, and unhealthy containers. Active receipt is committed only after internal health passes. Health verification waits for the container's bounded startup window. If candidate health fails after a replacement, the adapter attempts recovery using the previous committed digest and leaves the active receipt unchanged; any failed recovery is an explicit critical operator incident. Static rollback uses the previous digest and version identity:

```bash
bash /opt/kaori-website/rollback.sh
```

Rollback is **not** a database restore because this is a stateless website. Preserve the previous image digest and prior receipt; follow the shared-edge runbook to reattach a replaced healthy web container.

## Public-edge publication is separate

Follow **`OXY7O/KAORI/example/shared-edge/README.md`** and **`docs/deployment/SHARED_EDGE_OPERATIONS.md`** with the **already installed** host scripts. Do not copy/reimplement Nginx/Certbot here or mutate `/opt/shared-edge` until the website container and DNS identity are approved.

Example _shape only_, run as an explicitly authorized shared-edge operator after the website container is healthy:

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

## Release verification evidence

Collect the exact SHA, image digest, immutable OCI release metadata, application container ID and health result, edge registration, TLS/Host/SNI check result, browser desktop/tablet/mobile light/dark screenshots, keyboard/accessibility evidence, and the human acceptance decision. Do not close #5 or promote until required evidence is committed and approved.

## release deployment dispatch (manual only)

Once a unique prerelease for the current admitted staging SHA exists, an operator may dispatch `deploy-staging-host.yml` from `kaori/staging`, providing the exact `candidate_tag` and a link to explicit maintainer authorization (`approval_reference`). The workflow validates GitHub RC evidence for the exact SHA/image digest, checks repository-level credentials without printing them, verifies the SSH pinned host key, and transfers the reviewed adapter via a separate SSH deployment identity. There is no automated dispatch from a feature branch, and no automatic shared-edge publication. A GitHub Free private repository does not enforce human approval; the authorization link is audit evidence for the operating procedure, not a substitute for technical branch protection.

## Private release browser access (no shared-edge publication)

For the initial website release, the deployment adapter can opt into a **loopback-only** Compose override with `KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1`. This binds the web service exclusively to `127.0.0.1:18080` on the target VPS and leaves 80/443 and shared-edge sites untouched. It is not a public deployment.

Once the container health and immutable digest have been verified, an authorized reviewer can open an SSH tunnel from their workstation (using their own trusted administrator access):

```bash
ssh -N -L 18080:127.0.0.1:18080 -p <SSH_PORT> <ADMIN_USER>@<VPS_HOST>
```

Visit `http://127.0.0.1:18080/` locally to inspect desktop/mobile layout, theme toggle and accessibility. Do not use an untrusted SSH host or disable host key checks. DNS/TLS/public edge publication is a separately reviewed workstream and is **not** implied by successful private release deployment.

## Repository image namespace preflight for issue #10

The first release candidate publication attempt failed at the required Trivy vulnerability gate; it did not publish an OCI tag or deploy to VPS. A separate security workstream #12 updated the runtime image and enforced a release-equivalent Trivy check during Docker smoke. The repo-level Variable `KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE` is **still an operator-owned prerequisite**: it MUST end with `/kaori-website`, separate from the KAORI Application image. Both publisher and SSH deployment adapter now reject other image repository paths. Current publisher and release deployment preflight checks require this namespace; correction evidence is recorded in issue #10.

## Private ingress incident and correction (#15)

A real SSH tunnel attempt reached the VPS but failed because Docker only recorded the intended `127.0.0.1:18080` HostConfig entry: the effective `docker port` mapping and host HTTP listener were absent on the originally internal-only bridge. Read-only evidence: https://github.com/OXY7O/kaori-website/actions/runs/38981974418.

For private release access only, the overlay attaches the static container to a **separate user-defined bridge** (`website-release-loopback`) while retaining the base internal network. Host publication remains explicitly `127.0.0.1:18080:8080`. The deployment adapter must verify **both** effective Docker port binding and host-loopback HTTP before reporting PASS. A narrowly scoped, issue #15 staging-only remediation reuses the already signed `v0.1.0-rc.1` digest (no rebuild or tag rewrite); it does not modify production/shared-edge 80/443. Human browser acceptance is still required.
