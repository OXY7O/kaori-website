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

## RC.6 verified public release — 2026-10-18

The maintainer-approved Hero artwork and ecosystem copy were integrated in [PR #42](https://github.com/OXY7O/kaori-website/pull/42). The latest published and deployed website is signed [v0.1.0-rc.6](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.6), exact staging source `b8ccb60f0c208b7f8de268f459eacbb309e6f24a`, OCI digest `docker.io/lethisaputri/kaori-website@sha256:f43635107bd541c173a059ddebbb70d36d2677494c2084ebb821d6dde4a699cc`.

- [Exact-SHA Full Admission + Docker Runtime Admission #39098822528](https://github.com/OXY7O/kaori-website/actions/runs/39098822528) **PASS**.
- [Signed publication and verified public SSH deployment #39098822357, attempt 2](https://github.com/OXY7O/kaori-website/actions/runs/39098822357) **PASS**. Mandatory Trivy HIGH/CRITICAL, Cosign verification, SPDX SBOM, SLSA provenance, immutable digest and GitHub prerelease evidence succeeded. Initial admission wait exited fail-closed while admission was pending; verification succeeded only after the same SHA was fully admitted.
- Host released the exact immutable digest into the independent non-root website container with `127.0.0.1:18080` health **PASS**. Existing registration preflight and `edge-public` reattachment **PASS**; `https://kaori.cloud/healthz`, `https://app.kaori.cloud/health/ready`, and `https://auto.kaori.cloud/healthz` HTTPS readiness **PASS**. No DNS, Nginx, Certbot or application mutations were made.
- Previous signed `v0.1.0-rc.5` remains immutable rollback authority (`sha256:d759d81fd081ede381eca7bdb2d44abfc8abe61a067df5f1090ccf6d40ecf943`). The used one-time `publication-43-once.yml` workflow is retired through the reviewed cleanup workstream without rebuilding or redeploying RC.6; cleanup commits are not part of the deployed source.
- **Human Visual QA remains pending:** inspect the approved image on the actual website, full light/dark, responsive desktop/tablet/mobile, integration filters, footer email, keyboard and accessibility. An HTTP-health PASS is not browser or human acceptance. Promotion to `main` and a stable release remain **HOLD**.

## Issue #48 — bounded one-time signed RC.7 publication

The maintainer-reviewed six-point typography and contrast fix [PR #47](https://github.com/OXY7O/kaori-website/pull/47) is source authority #46. Its new immutable candidate `v0.1.0-rc.7` is authorized under issue #48 only after exact staged SHA Full Admission and Docker Runtime Admission pass; the RC.6 signed digest `sha256:f43635107bd541c173a059ddebbb70d36d2677494c2084ebb821d6dde4a699cc` stays the rollback authority.

`.github/workflows/publication-48-once.yml` is an issue-limited bootstrap because the website canonical manual release workflows are still unavailable from unpromoted `main`. It runs only for a staging merge marker `[KAORI_WEBSITE_PUBLICATION_48]` and fails closed unless GitHub's exact-SHA Full Admission is completed successfully. A bounded 3-attempt admission wait prevents shared-runner contention; rerun the blocked verification job only after same-SHA admission passes. No new release script or weakened gate: canonical signed image, Trivy HIGH/CRITICAL, Cosign, SPDX SBOM, SLSA provenance, pinned SSH, existing-edge preflight and three-domain HTTPS readiness remain required.

Remove the one-time workflow via a reviewed cleanup PR after publication, without rebuilding/redeploying the immutable digest. Browser light/dark, two-line copy, one-line integration message, Violet statement contrast, responsive footer and human acceptance remain **PENDING**, independent of HTTPS health. Promotion to `main` remains HOLD.

## RC.7 signed public deployment and rollback evidence — 2026-10-18

Maintainer's six screenshot fixes [PR #47](https://github.com/OXY7O/kaori-website/pull/47) and one-time release authority [PR #49](https://github.com/OXY7O/kaori-website/pull/49) were merged into `kaori/staging`. Exact release SHA `1c23699206eb176affd99c7ff6603918ec0a9aed` produced signed [v0.1.0-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.7) at immutable image `docker.io/lethisaputri/kaori-website@sha256:aa1de44231fda4cfb485704cae493b0569da3534e3bd3193bad00fa360cf60ea`.

- [Exact-SHA Full Admission and Docker Runtime Admission #39105396294](https://github.com/OXY7O/kaori-website/actions/runs/39105396294) **PASS**.
- [Signed release and SSH public-edge deployment #39105396334 attempt 2](https://github.com/OXY7O/kaori-website/actions/runs/39105396334) **PASS**: Trivy HIGH/CRITICAL, Cosign signature verification, signed SPDX SBOM/provenance, immutable release digest, pinned SSH host verification.
- Initial admission check rejected the release while same-SHA admission was incomplete; only its failed verification job was rerun **after** all admission lanes passed. No gate was bypassed.
- The deployed isolated non-root website image, health at `127.0.0.1:18080`, existing `edge-public` reattachment, public `kaori.cloud` readiness and independent `app.kaori.cloud` / `auto.kaori.cloud` HTTPS readiness all **PASS**. No shared Nginx, DNS, Certbot or KAORI Application mutation.
- Previous signed [RC.6](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.0-rc.6), digest `sha256:f43635107bd541c173a059ddebbb70d36d2677494c2084ebb821d6dde4a699cc`, remains the rollback candidate. The temporary `publication-48-once.yml` was removed under #48 without rebuilding or redeploying RC.7.
- User browser review is still required for **two-line** Hero/Architecture/Product Experience, **single-line** integration message, both modes' Violet card contrast, footer typography, mobile wrap/accessibility and real visual acceptance. Do not promote `main` on CI/health alone.

## Issue #99 — public edge safety for canonical manual release

`Release Deployment` now has an explicit boolean `publish_existing_edge` option,
defaulting to `false`. The default is an isolated, loopback-only UAT release.
It must not replace a website container already connected to `edge-public`.
The existing pinned-SSH deployment adapter checks for that condition before
recreating a container and blocks the action.

For an authorized public replacement, the maintainer must approve the exact
signed candidate and the public publication step, then select
`publish_existing_edge=true`. The adapter reuses the approved
`reattach-existing-site.sh preflight` before replacing the website container
and `reattach-existing-site.sh attach` afterward. The existing script validates
the registered `kaori.cloud` site and the public Website, Application and
Docs HTTPS readiness. The formerly checked `auto.kaori.cloud` endpoint was retired
with n8n (ops-runbooks #93; KAORI #4197); it must not block an active release.
Public deployment cannot claim success if any **active** site check fails.

No DNS, Nginx, Certbot, site registration, KAORI Application or n8n mutation
is added. If the site registration is unreadable or any public check fails,
stop and follow the standalone shared-edge runbook. The workflow summary
distinguishes isolated deployment from public edge readiness. Full TLS,
redirect, Host/SNI, browser UAT and human acceptance remain separate gates.

The signed `v0.1.1-rc.1` and `v0.1.1-rc.2` digests are immutable.
These safeguards only apply to releases from subsequently admitted source.
See incident #98 and prevention #99 for operator evidence and review.

## Isolated RC/UAT runtime — #124

The original private Compose override is not an isolated staging environment once
the `kaori-website` container has joined the production `edge-public` network.
[RC UAT deployment #41538667672](https://github.com/OXY7O/kaori-website/actions/runs/41538667672)
correctly blocked instead of replacing a publicly attached container.

For `kaori/uat-request`, the canonical SSH deployment now uses the existing
approved `/opt/kaori-website` authority with separate paths:

- UAT release adapters: `/opt/kaori-website/uat/releases/<accepted-sha>/server`.
- UAT receipt and previous-release state: `/opt/kaori-website/uat/deploy-state`.
- Independent Docker Compose project: `kaori-website-uat`.
- UAT ingress: `127.0.0.1:18083:8080`, using the new `compose.uat.yml`.
- Production project `kaori-website`, its existing public container, state in
  `/var/lib/kaori-website/deploy-state` and edge attachment remain unchanged.

The remote preflight requires a writable Website root, safe non-symlinked
UAT paths, at least 256 MiB of available memory, 512 MiB of free disk and
an unoccupied UAT port unless owned by the existing UAT project. These are
runtime checks, **not assertions that capacity/port are currently available**.
It rejects a missing or unhealthy public Website and verifies its container
identity and health again after the private deployment. No shared-edge,
KAORI App or Docs service is restarted.

The same `deploy.sh`, `verify.sh` and `rollback.sh` enforce the UAT project
and release-state identity. Verification checks the signed OCI digest,
non-root runtime, container and host-loopback health, correct port and
embedded `Website build vX.Y.Z-rc.N` footer identity. An operator reviews
the private Website through an authenticated SSH tunnel:

```bash
ssh -N -L 18083:127.0.0.1:18083 -p <SSH_PORT> <ADMIN_USER>@<WEBSITE_HOST>
```

Then browse `http://127.0.0.1:18083/`. Do not use a public hostname for
an unaccepted RC. A UAT rollback must preserve `COMPOSE_PROJECT_NAME`,
`KAORI_WEBSITE_RUNTIME_ENV=uat`, `KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1`
and `KAORI_WEBSITE_STATE_DIR=/opt/kaori-website/uat/deploy-state`.
A new issue-linked staging merge requires a **new** signed RC; the already
published `v0.1.2-rc.1` digest remains immutable and is not rebuilt.
Human visual/UAT approval and promotion to main are separate gates.

## Public Website RC readiness after n8n decommission — #129 / #130 (2026-11-03)

The maintainer authorized public RC review on the **same** `kaori-website` Compose
project and public hostname used by stable. A signed RC replaces the active
Website container through the existing **manual** Release Deployment workflow
on the exact admitted staging SHA with `publish_existing_edge=true`.
This is a preview publication, **not** promotion to `main` or stable release.
Preserve the prior accepted stable image/receipt for rollback.

Public release verification must also fetch `https://kaori.cloud/` over trusted
HTTPS and confirm that its rendered `Website build vX.Y.Z-rc.N` footer matches
the **selected running Website container's immutable OCI version label**.
An HTTP `/healthz` PASS by itself does not prove the edge is serving the
new build; a missing/stale footer is a release-verification **FAIL** and
requires shared-edge routing/cache diagnosis, not a blind rebuild.

The three **active** HTTPS readiness destinations after n8n retirement are:

- Website: `https://kaori.cloud/healthz` (body `healthy`).
- Application: `https://app.kaori.cloud/health/ready` (JSON `status=ready`).
- Docs: `https://docs.kaori.cloud/healthz` (HTTP 2xx).

The old `auto.kaori.cloud` site was archived under
[ops-runbooks #93](https://github.com/OXY7O/ops-runbooks/issues/93); the obsolete
certificate lineage was retired under
[KAORI #4197](https://github.com/OXY7O/KAORI/issues/4197). Do not restore n8n or
skip HTTPS/TLS just to pass a stale Website check.

**Observed partial deployment:** [run #41556104946](https://github.com/OXY7O/kaori-website/actions/runs/41556104946)
recreated the public Website with signed `v0.1.2-rc.3`, passed host-loopback,
image/health checks, and committed the release receipt. The job **FAILED** at
obsolete n8n TLS/SNI verification; this is not a completed release. Before
retrying, inspect the actual public build label and digest, retained rollback
receipt, existing shared-edge site registration and live three-domain HTTPS.
Any code-authority change needs issue-linked staging PR, fresh admission and
its own immutable release identity; do not rebuild or mutate an old RC tag.

After successful verified public RC publication, retire the independent private
`kaori-website-uat` Compose runtime only via a reviewed, scoped host operation
with runtime and rollback evidence. Until then the host can still have a private
UAT container; do not claim single-active-runtime completion solely from the
public Website replacement. Human visual/browser acceptance remains mandatory
before staging-to-main promotion. The shared-edge owner retains full
DNS/redirect/TLS/Host-SNI and certificate renewal checks via the existing
[KAORI shared-edge procedure](https://github.com/OXY7O/KAORI/blob/main/docs/deployment/SHARED_EDGE_OPERATIONS.md).

## UAT verification and recovery incident — #156 (2026-11-08)

[Signed v0.1.2-rc.6](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2-rc.6)
was published from admitted staging
`62f164e222053c0774f08748f6cbe8d822f694ef`. The deliberate
[private UAT request #42478001400](https://github.com/OXY7O/kaori-website/actions/runs/42478001400)
**FAILED**. The existing UAT Compose service was started, but candidate
verification failed and the subsequent recovery printed an unverified
`CRITICAL: previous website recovery failed`. During recovery the host
loopback HTTP health was **PASS**, while the previous image was compared
to the **new candidate's footer version**. The failed deployment did not
commit the candidate release receipt, but the final host/runtime state
cannot be established from the GitHub Actions job alone.

[Remediation authority #156](https://github.com/OXY7O/kaori-website/issues/156)
corrects two release-adapter defects: avoid short-circuiting streamed
homepage output with `grep -q` under `pipefail`, and recover the prior
image using the **prior committed receipt's version**, not the rejected
candidate version. Regression checks use the existing Node test runner
and preserve digest, version, health, localhost-only and non-root gates.
A new source revision requires a **new admission and uniquely signed RC**;
never rebuild or overwrite the immutable RC.6 digest.

**Operator stop condition:** do not retry `kaori/uat-request`, blindly
restart/replace containers, remove the UAT project, or detach the public
Website based on the false/ambiguous critical message. First read back the
actual state on the approved Website host using the authorized operator
identity. Record only sanitized output: public `kaori-website` and
private `kaori-website-uat` Compose container names, health, image digest,
published port, edge network membership, UAT `release.env` versus
`previous-release.env` presence, and trusted HTTPS health for Website,
Application and Docs. Do not print deployment credentials or private
release receipt contents into public issues. Existing supported checks:

```bash
docker ps -a --filter label=com.docker.compose.project=kaori-website \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker ps -a --filter label=com.docker.compose.project=kaori-website-uat \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker ps -q --filter label=com.docker.compose.project=kaori-website-uat |
  while read -r container; do
    docker inspect --format '{{.Name}}: health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} image={{.Config.Image}}' "$container"
    docker port "$container" 8080/tcp || true
  done
curl -fsS --max-time 5 https://kaori.cloud/healthz
curl -fsS --max-time 5 https://app.kaori.cloud/health/ready
curl -fsS --max-time 5 https://docs.kaori.cloud/healthz
```

**Current operating policy:** [single-active public Website #129](https://github.com/OXY7O/kaori-website/issues/129) prohibits a second active **public** RC/stable slot. The older [private UAT #124](https://github.com/OXY7O/kaori-website/issues/124) adapter remains technically available, and a temporary private RC.7 UAT was actually deployed under a separate authorization. **Do not claim that this temporary private runtime has been retired**: its current host state and safe retirement require operator evidence and separate acceptance under [#158](https://github.com/OXY7O/kaori-website/issues/158). Preserve signed receipts and the earlier public rollback identity; no standing parallel private UAT is authorized.

## Public RC.7 cutover and outstanding acceptance — #158 (2026-11-08)

The maintainer expressly approved replacing the **existing single public** Website RC.5 with signed [v0.1.2-rc.7](https://github.com/OXY7O/kaori-website/releases/tag/v0.1.2-rc.7) under [#158](https://github.com/OXY7O/kaori-website/issues/158); this is not blanket approval for a stable release, new public slot, host cleanup or main promotion.

- **Immutable source:** `kaori/staging@b77a8dc98d4b342e7002e251fe4ff0abc7149dbe`; signed image `sha256:d686b54a219ea96d60a108bf947f9d0f540275c230171c92ede06a14c56cb10c`.
- **Quality:** [Full Admission #42482112697](https://github.com/OXY7O/kaori-website/actions/runs/42482112697) four required jobs SUCCESS, 156 Playwright passes, non-root container runtime smoke and Trivy configured HIGH/CRITICAL scan with zero reported findings on Alpine 3.24.3. [RC publisher #42484280809](https://github.com/OXY7O/kaori-website/actions/runs/42484280809) SUCCESS.
- **Private candidate:** [UAT #42484609068](https://github.com/OXY7O/kaori-website/actions/runs/42484609068) SUCCESS with `edge=0`, private `127.0.0.1:18083` loopback, accepted signed digest/footer. The maintainer explicitly accepted all six real **private** visual UAT checks.
- **Public cutover:** [Release Deployment #42488631688](https://github.com/OXY7O/kaori-website/actions/runs/42488631688) completed SUCCESS via the **existing** `workflow_dispatch` on the same admitted staging SHA, with `publish_existing_edge=true`. Its logs prove public `127.0.0.1:18080` image/health/non-root checks, existing edge and `Website build v0.1.2-rc.7` identity, release receipt commit, and Website/App/Docs HTTPS readiness. No alternative deployment workflow or image rebuild.
- **Operator checkpoint:** a fail-closed read-only script returned `PASS: Public Website RC.7, Application and Docs readiness` after inspecting running public image/health, signed RC.7 `release.env`, prior signed **RC.5** `previous-release.env` and three-domain HTTPS. Because only the final marker was pasted, the intermediate readbacks are supported by the script's completion, not separately transcribed output.

**Remaining gates — do not close #158/#156 based on CI alone:** (1) human **public** desktop/tablet/mobile light/dark, keyboard/accessibility, navigation and security-link acceptance at `https://kaori.cloud`; (2) separate operator-scoped approval and safe retirement of the temporary `kaori-website-uat` Compose runtime **without** deleting release receipts, volumes or rollback evidence; (3) independent public Website/App/Docs/rollback readback **after** retirement. Exact patched `musl`, `musl-utils` and `zlib` installed versions are pending under [#147](https://github.com/OXY7O/kaori-website/issues/147), even though hosted Trivy passed its configured severity gate.

For read-only package provenance, an authorized operator can inspect the **existing public** Website container without changing the runtime:

```bash
container="$(docker ps -q --filter label=com.docker.compose.project=kaori-website --filter label=com.docker.compose.service=web)"
test -n "$container"
docker exec "$container" apk info -vv | grep -E '^(musl|musl-utils|zlib)-[0-9]'
```

Do **not** use `docker compose down -v`, restart unrelated shared-edge services, discard rollback receipts, dispatch a new release, or infer `main`/stable acceptance from this documentation checkpoint. The earlier failed RC.6 private UAT run remains historical FAILURE.
