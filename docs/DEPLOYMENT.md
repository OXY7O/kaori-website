# KAORI Website Server Deployment

## Boundaries

KAORI Website is an independent, static-only Docker Compose project. It shares a **physical target VPS** with KAORI Application **only after host capacity and trust are verified**. The website does not own any KAORI application directories, database, Redis, Celery, database migrations, metrics, or secrets.

Website application paths (existing deployment layout):

- `/opt/kaori-website`: reviewed Compose and adapter scripts.
- `/var/lib/kaori-website/deploy-state`: mode-restricted release receipt and previous release pointer.
- Container project: `kaori-website`; internal upstream HTTP port **8080**, with **no host ports**.
- Edge DNS / Nginx / Certbot and host **80/443** remain owned by `/opt/shared-edge`, outside this repository.

Never modify `/opt/kaori`, `/etc/kaori`, `/var/lib/kaori` or the KAORI application Compose project while deploying the website. The approved public hostname split is `kaori.cloud` for this website and `app.kaori.cloud` for the application (migration authority `OXY7O/KAORI#2210`). If the legacy apex edge registration still points to the application, reassignment requires a **separately reviewed shared-edge cutover**, safe rollback, and DNS/TLS evidence. The application and automation site registrations must remain intact.

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

**Approved routing:** `https://kaori.cloud` → KAORI Website (static landing page); `https://app.kaori.cloud` → KAORI Application (login/dashboard). Both remain separate upstreams and registrations. The existing application migration was handled under `OXY7O/KAORI#2210`; apex reassignment requires independent approval and must preserve `auto.kaori.cloud` plus unrelated registrations. Private release verification is not proof of public cutover.

Follow **`OXY7O/KAORI/example/shared-edge/README.md`** and **`docs/deployment/SHARED_EDGE_OPERATIONS.md`** with the **already installed** host scripts. Do not copy/reimplement Nginx/Certbot here or mutate `/opt/shared-edge` until the website container and DNS identity are approved.

Example _shape only_, run as an explicitly authorized shared-edge operator after the website container is healthy:

```bash
cd /opt/shared-edge/runtime
bash ./publish-container.sh \
  --site-id kaori-website \
  --domain kaori.cloud \
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

## Release deployment dispatch (manual only)

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

## Issue #21 — apex publication acceptance and rollback

The staging-only `.github/workflows/publication-21-once.yml` is a **temporary release activation**, not a public-edge mutation workflow. It can run only on the staging merge that changes the adapter file and carries the explicit `[KAORI_WEBSITE_PUBLICATION_21]` merge marker. It waits for the **same merged commit's** successful Full Admission, then delegates RC publication and isolated deployment to the canonical `publish-candidate.sh` and `deploy-release.sh`. The next intended RC is `v0.1.0-rc.2`; existing `v0.1.0-rc.1` is an older, immutable private candidate. If staging changes during admission or any trust, image, runner or host prerequisite fails, publication stops. Remove the temporary adapter under reviewed issue authority after its intended execution.

**No website CI, private UAT deploy or RC publication authorizes public ingress by itself.** Follow the existing [KAORI shared-edge runbook](https://github.com/OXY7O/KAORI/blob/kaori/staging/docs/deployment/SHARED_EDGE_OPERATIONS.md) and its installed `publish-container.sh`, `apply.sh`, and `verify.sh`; do not invent a second TLS implementation.

Before an approved apex cutover, the shared-edge operator must record these **read-only** facts without exposing secret configuration values:

1. Current DNS A/AAAA/CAA and verified edge destination for `kaori.cloud`, `app.kaori.cloud`, and `auto.kaori.cloud`; current trusted HTTPS/health for the latter two domains.
2. Existing `/opt/shared-edge/config/sites/*.env` site ID, public hostname, upstream alias, port and readiness path. Confirm whether any legacy registration still owns `kaori.cloud`. **Never register a second active site with the same apex hostname**, delete the application `kaori` site, or overwrite unrelated n8n routing.
3. The signed website RC's accepted source SHA, immutable digest, healthy current `kaori-website` web container, effective `127.0.0.1:18080` private UAT binding and release-state rollback pointer. Require browser light/dark, mobile, keyboard, accessibility and CTA review on the exact digest.
4. Reviewed parity of the **installed** shared-edge runtime (particularly Certbot entrypoint and `verify.sh`) with the approved shared-edge source; running `apply.sh` without that parity may revive the previously observed certificate/redirect failures. Check free memory and capacity of the shared VPS.

After recording a protected rollback copy of the original apex registration and resolving any legacy apex duplicate **under the shared-edge operator's authority**, use the existing publish command for site ID `kaori-website`, domain `kaori.cloud`, upstream **8080**, alias `kaori-website-web`, `/healthz`, TLS enabled and websockets disabled. Do this only for the verified healthy website container. Invoke the installed `apply.sh` and `verify.sh --wait-seconds 360 --renewal-dry-run`; preserve existing Certbot lineages, including old apex renewal, and refuse unverified TLS or HTTP fallback.

The acceptance evidence must separately prove: correct website on HTTPS apex; valid SAN/chain/HSTS; exact HTTP-to-HTTPS redirect; unknown Host/SNI rejection; website `/healthz`; `app.kaori.cloud` login/dashboard/generation unchanged; `auto.kaori.cloud` unchanged; and the final browser review. A failure triggers **edge-only** rollback to the protected registration and last-known-good configuration through existing scripts, followed by full three-domain verification. Do not redeploy/rollback KAORI Application or rebuild the website image just because edge publication fails. Stop promotion to `main` until explicit human acceptance of the tested SHA and digest.

Record GitHub release, staging Full Admission, private deployment, edge verification, rollback evidence and human acceptance on [Issue #21](https://github.com/OXY7O/kaori-website/issues/21). GitHub Project fields and native relationships remain manual where the connector has no update support.

## Issue #27 — bounded existing-edge reattachment for website RC.3

The public website was already published and TLS-verified by the shared-edge operator under #21. This **does not** authorize a second DNS/Nginx/Certbot deployment implementation. The versioned website release adapter optionally supports `KAORI_WEBSITE_ATTACH_EXISTING_EDGE=1` **only** for the issue-authorized RC.3 activation. Canonical manual release deployments continue defaulting to private loopback, with no implicit edge mutation.

Before replacing any existing website container, the adapter checks that `/opt/shared-edge/config/sites/kaori-website.env` is a readable, non-symlinked approved site registration mapping exactly `kaori.cloud` to `kaori-website-web:8080`, `/healthz` with TLS. It also requires the `edge-public` Docker network and curl. If the preflight fails (including SSH user not permitted to read the site file), deployment **does not begin**; an authorized edge operator must finish the publication separately.

After the immutable signed candidate passes the normal host deployment and health verification, `deploy/server/reattach-existing-site.sh attach` attaches **only that new website web container** to the already-published `edge-public` network with the existing `kaori-website-web` alias. It never changes host 80/443 listeners, existing application/n8n containers, edge registrations, Nginx, Certbot or DNS. It then verifies public `https://kaori.cloud/healthz`, `https://app.kaori.cloud/health/ready` and `https://auto.kaori.cloud/healthz`; a failed check fails the release job and requires operator-managed shared-edge reconciliation using `/opt/shared-edge/runtime/apply.sh` and existing rollback evidence. Do not mark public RC.3 PASS merely from the private container deployment.

The one-time `.github/workflows/publication-21-once.yml` temporary adapter is reconfigured to publish immutable `v0.1.0-rc.3` under #27 after exact-merged-staging Full Admission. It must be retired via reviewed cleanup PR once executed. The previous RC.2 OCI digest and the operator's existing protected edge backup at `/opt/shared-edge/backups/website-20261017-035606` remain recovery evidence. Website screenshots, responsive light/dark, keyboard/accessibility and human acceptance remain separate from HTTP health PASS.

## Issue #30 — rejected RC.3 and fail-closed RC.4 signature recovery

At exact admitted source `948d5c6e9f9aa80bf9c0d407993e739da4280bf2`, [RC.3 release run #38997902163](https://github.com/OXY7O/kaori-website/actions/runs/38997902163) failed its **mandatory Cosign verification**. The image `v0.1.0-rc.3` was built, HIGH/CRITICAL scan passed, and a registry manifest was pushed (digest `sha256:36b071eb0b96b50b6ef0079de1a5eea87b0cd2db5f417dc80b302b8cc9423fc0`), but `cosign verify` reported `no signatures found` immediately following a signature push. **No GitHub Release and no host deployment occurred.** The original tag and manifest remain historical rejected evidence; never retag, overwrite, or treat this artifact as accepted.

The canonical publisher now retries verification of the **same signed digest** for up to eight bounded attempts, including its unchanged mandatory identity, OIDC issuer and attestation types. Exhaustion still **fails** the release before GitHub Release creation and blocks deployment. This addresses potential registry referrer propagation delays without allowing an unsigned artifact or dropping checks.

The new issue-authorized one-time publication activation targets **`v0.1.0-rc.4`** at its **own** future exact-admission staging SHA. RC.2 remains the last verified publicly active image until a new signed digest is accepted and public host health is independently proven. Keep website/browser visual review and human acceptance separate from release security verification.

## RC.4 public website operational evidence — 2026-10-18

The issue #30 security recovery completed under [PR #31](https://github.com/OXY7O/kaori-website/pull/31). The prior RC.3 attempt is historical _rejected_ evidence; **the latest accepted and deployed candidate is [v0.1.0-rc.4](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.4)** from staging source `70860f7813505b875953b533e912dc7f3c1d7899`, at immutable `docker.io/lethisaputri/kaori-website@sha256:c511b3ab2b603c0c2106ce31bb6cd293da998166cd0bf1f6627acfed88e4dc13`.

- [Exact-SHA admission run #38998956011, attempt 2](https://github.com/OXY7O/kaori-website/actions/runs/38998956011): Promotion Source Policy, Full Admission, Docker Runtime Admission **PASS**.
- [Release and deploy run #38998956033, attempt 2](https://github.com/OXY7O/kaori-website/actions/runs/38998956033): immutable Trivy HIGH/CRITICAL, Cosign mandatory signature verification, signed SPDX SBOM/provenance, attestations, immutable release, pinned-SSH deployment, non-root server and host-loopback readiness **PASS**.
- The already-registered site `kaori.cloud -> kaori-website-web:8080` passed read-only domain/alias/TLS preflight **before** replacing the website container. The new healthy digest-qualified container was reattached to existing `edge-public`, and subsequent public `https://kaori.cloud/healthz`, `https://app.kaori.cloud/health/ready` and `https://auto.kaori.cloud/healthz` checks all **PASS**. The adapter did not edit DNS, Nginx, Certbot or application/n8n services.
- RC.2 remains the previous committed website digest and rollback authority. The issue #21 protected edge backup remains operator-owned; do not restore old conflicting `kaori-legacy.env` simultaneously with `kaori-website.env`.
- Under #20, the **consumed** single-use RC.4 publication workflow has been removed from staging via reviewed follow-up. Canonical manual publisher/deployer remain unchanged.
- **Human Visual QA is pending:** verify the actual deployed responsive/light/dark homepage, keyboard/accessibility, CTA and privacy-safe marketing copy with the maintainer under #3/#27. No `main` promotion or stable release is authorized by the public HTTP checks alone.

## Issue #38 — one-time RC.5 publication after full-page visual revision

Reviewed homepage change [PR #37](https://github.com/OXY7O/kaori-website/pull/37) integrated into `kaori/staging`. Issue #38 authorizes a **single** new signed prerelease `v0.1.0-rc.5`, with the historical RC.4 digest `sha256:c511b3ab2b603c0c2106ce31bb6cd293da998166cd0bf1f6627acfed88e4dc13` retained for recovery.

`.github/workflows/publication-38-once.yml` is a temporary, issue-authorized staging activation because canonical manual release workflows cannot yet be dispatched from the unpromoted seed `main`. It requires an explicit `[KAORI_WEBSITE_PUBLICATION_38]` staging merge marker, checks that the staging HEAD and completed successful Full Admission match its exact merge SHA, then invokes **unchanged canonical** `scripts/release/publish-candidate.sh` and `scripts/release/deploy-release.sh`. Its short bounded admission wait is deliberately fail-closed to avoid monopolizing a shared runner; if the exact-SHA staging admission is still running, do **not** bypass the check—rerun the blocked verification job only after Full Admission and Docker Runtime Admission succeed.

The existing `KAORI_WEBSITE_ATTACH_EXISTING_EDGE=1` read-only site registration preflight precedes container replacement. After digest-pinned SSH deployment it attaches the healthy website to the already-authorized public edge and checks HTTPS readiness for all three existing services without editing their Nginx, DNS, Certbot or application configurations. Mandatory Trivy HIGH/CRITICAL, Cosign signature, SPDX SBOM and SLSA provenance remain fail-closed. **Release/deploy and browser Visual QA are not yet passed by adding this workflow.**

After signed RC.5 deployment and HTTPS checks PASS, retire this temporary workflow under #38 with a reviewed follow-up PR. Full-page light/dark, mobile/tablet, contrast, focus, filters and footer contact browser testing plus explicit Human Acceptance remain separate under #3/#36; do not promote `main` before acceptance.

## RC.5 verified public release — 2026-10-18

The homepage/light-dark UI and brand refinement was integrated under [PR #37](https://github.com/OXY7O/kaori-website/pull/37). [PR #39](https://github.com/OXY7O/kaori-website/pull/39) admitted and published signed **[v0.1.0-rc.5](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.5)** from staging SHA `703970f04ce27e1736e766736c49228c2a0a531e`, OCI `docker.io/lethisaputri/kaori-website@sha256:d759d81fd081ede381eca7bdb2d44abfc8abe61a067df5f1090ccf6d40ecf943`.

- [Exact-SHA Full Admission + Docker Runtime Admission #39095233374](https://github.com/OXY7O/kaori-website/actions/runs/39095233374) **PASS**.
- [One-time signed publication and verified SSH deployment #39095233281, attempt 2](https://github.com/OXY7O/kaori-website/actions/runs/39095233281) **PASS**: Trivy HIGH/CRITICAL, mandatory Cosign signature, signed SPDX SBOM/SLSA provenance, immutable digest and accepted GitHub Release.
- The first short admission-wait job failed safely while same-SHA Full Admission was unfinished. After Full Admission and Docker Runtime Admission both passed, rerunning **only** the failed verification job unblocked publication. The required source/signature gates were never bypassed.
- Host receipt for RC.5 committed after healthy non-root container and private `127.0.0.1:18080` HTTP PASS. Approved existing site registration preflight and network reattachment completed. Public `https://kaori.cloud/healthz` and the independent `app.kaori.cloud` / `auto.kaori.cloud` HTTPS readiness all **PASS**, with no new DNS, Nginx, TLS or application mutation.
- Previous signed `v0.1.0-rc.4` remains rollback authority at `sha256:c511b3ab2b603c0c2106ce31bb6cd293da998166cd0bf1f6627acfed88e4dc13`. The one-time `publication-38-once.yml` workflow has been removed under reviewed issue #38 cleanup, without rebuilding or redeploying RC.5.
- **Not automatically approved:** full-browser visual/contrast/theme parity at light and dark, responsive device screenshots, accessibility, integration filter interactions and `mailto:` owner contact, plus explicit Human Acceptance #3/#36. Keep `main` promotion and stable release on HOLD until reviewed acceptance.
