# KAORI Website Server Deployment

## Boundaries

KAORI Website is an independent, static-only Docker Compose project. It shares a **physical target VPS** with KAORI Application **only after host capacity and trust are verified**. The website does not own any KAORI application directories, database, Redis, Celery, database migrations, metrics, or secrets.

Website application paths (existing deployment layout):

- `/opt/kaori-website`: reviewed Compose and adapter scripts.
- `/var/lib/kaori-website/deploy-state`: mode-restricted release receipt and previous release pointer.
- Container project: `kaori-website`; internal upstream HTTP port **8080**. The approved release overlay may expose a **loopback-only host health port** (`127.0.0.1:18080`), never a public Website UAT entrypoint.
- Edge DNS / Nginx / Certbot and host **80/443** remain owned by `/opt/shared-edge`, outside this repository.

Never modify `/opt/kaori`, `/etc/kaori`, `/var/lib/kaori` or the KAORI application Compose project while deploying the website. The approved public hostname split is `kaori.cloud` for this website and `app.kaori.cloud` for the application (migration authority `OXY7O/KAORI#2210`). If the legacy apex edge registration still points to the application, reassignment requires a **separately reviewed shared-edge cutover**, safe rollback, and DNS/TLS evidence. The independent Application and Docs shared-edge registrations must remain intact.

The same versioned **application deployment protocol** as KAORI is used: exact accepted staging SHA â Full Admission â build once â immutable OCI image digest â dedicated host SSH trust boundary â health verification â release verification evidence â human acceptance â promotion of the same digest to production. A docker image build or Astro CI success alone is **not** website release acceptance.

## Current public UAT acceptance and host checks

Normal Website Human UAT uses **only the real public DNS and trusted HTTPS**
endpoint, `https://kaori.cloud`, for visual/browser and user-facing HTTP
acceptance. The approved shared-edge adapter checks public Website footer,
`/healthz`, Application and Docs HTTPS readiness and exact signed build identity.
No SSL/SSH tunnel, private browser URL or `127.0.0.1:18083` is an alternative
normal UAT route. Release deployment still uses pinned SSH as an **internal host
transport**, and loopback probes and process capabilities remain **internal
security/health checks**, not additional end-user acceptance endpoints.

Historical private RC inspection and the optional isolated host security test
under [#284](https://github.com/OXY7O/kaori-website/issues/284) are separate,
release-specific exceptions. They do not change the public-only UAT policy
accepted under [#195](https://github.com/OXY7O/kaori-website/issues/195) and
[#288](https://github.com/OXY7O/kaori-website/issues/288).

## Reference host topology and portability

**Current approved target:** `staging` and `production` GitHub
Environments share **one physical KAORI Website VM, one public
`kaori-website` Compose project, one release receipt, and one public
`https://kaori.cloud` slot**. These Environment names enforce
different release authorization, reviewer, and credential scopes; they
do not currently correspond to independently running services.

- **Staging:** A reviewed, admitted `kaori/staging` commit yields an
  intentional signed `vX.Y.Z-rc.N`, which may be deployed to the one
  public Website slot under the existing release/edge guard. A new RC
  can temporarily replace a stable release on the public site, by
  explicit accepted operational policy.
- **Production:** A reviewed `kaori/staging → main` promotion and
  release-specific Human UAT authorize a separately protected `production`
  Environment review. When the configured, healthy receipt-backed runtime
  already runs the accepted signed RC digest, the publisher records stable
  `vX.Y.Z` metadata without redeployment. If the running signed digest
  differs, the existing governed adapter may replace it with the accepted
  immutable RC **only after independent production authorization, safety
  preflight, rollback evidence and post-deployment health verification**.
  Neither path rebuilds or retags the image.
- **Rollback:** `/var/lib/kaori-website/deploy-state/release.env`
  and `previous-release.env` identify current and prior immutable
  Website images. An RC is never treated as automatically approved for
  production just because it is publicly accessible.
- **Safety:** Staging's `KAORI_WEBSITE_AUTO_STAGING_ENABLED` is an
  Environment-scoped, default-off RC publication switch. Production has **no
  automatic main-push release path**; the former
  `KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED` is retired from executable release
  authority. A valid explicit `Production Release` dispatch from protected
  `main` needs **only the stable SemVer input**. The independently approved
  promotion PR is derived from a previously reviewed release notes file. The
  request must pass exact-main admission checks and native `production`
  Environment approval before any privileged release step. It still must pass
  rights, SHA/digest, signed Human UAT, receipt, rollback and health checks.
  GitHub Environment Variables are mapped through step-local `vars` `env`
  bindings after the protected Environment boundary, not implicit shell
  exports. Developer Check has no release credentials.

### Moving to separate VMs later

The **release governance contract does not change** when infrastructure
is split. Use the existing `staging` and `production` GitHub
Environment scopes to configure distinct target values, as appropriate:

- Target identity: `KAORI_WEBSITE_HOST`,
  `KAORI_WEBSITE_HOST_PORT`, `KAORI_WEBSITE_HOST_USER`, and
  `KAORI_WEBSITE_HOST_DEPLOY_ROOT`.
- Pinned SSH trust: `KAORI_WEBSITE_HOST_SSH_PRIVATE_KEY`,
  `KAORI_WEBSITE_HOST_SSH_PASSPHRASE`, and
  `KAORI_WEBSITE_HOST_KNOWN_HOSTS`.
- Registry identity: `KAORI_WEBSITE_DOCKER_REGISTRY_HOST`,
  `KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE`, and their existing
  environment-appropriate credential secrets.
- Provider-controlled routing: approved DNS/TLS/SNI, shared-edge
  site registration, network attachment, and public endpoint checks.

**Current limitation:** A configurable SSH destination does **not**
commission an unmanaged VM or authorize a new DNS/TLS/edge path.
`scripts/release/promote-stable.sh` can reconcile an already prepared,
healthy, receipt-backed target using the accepted signed RC and reviewed
deployment adapter. It fails closed for a fresh/unmanaged VM, missing
rollback/receipt evidence, wrong project identity or an unapproved public
edge. Changing only Environment variables cannot bootstrap that target.

Before any split, separately review and validate target provisioning,
production deployment/rollback and receipt handoff using the **existing
signed digest and deployment adapters**, plus provider-owned edge
cutover. A code or adapter change may be necessary at that point;
it must be issue-scoped, reviewed, tested, and UAT-accepted before
activation. Never infer successful two-VM operation from the current
one-slot release evidence. The optional separate-host adapter is
tracked under [Website #234](https://github.com/OXY7O/kaori-website/issues/234).

### Configured runtime identity — Website #237

GitHub Environment `staging` selects the staging **deployment target**;
`production` selects the production target. The operator may configure
both to the same effective runtime, or to different runtimes (including
different Compose projects on one VM). Neither the number of Environments
nor the server IP alone determines the number of running services. There
is **no topology-mode or slot-count switch** in the release contract.

In the existing staging RC deploy job, the optional Environment-scoped
variables `KAORI_WEBSITE_COMPOSE_PROJECT`,
`KAORI_WEBSITE_STATE_DIR`, and `KAORI_WEBSITE_LOOPBACK_PORT`
are passed to the canonical deployment adapter. If unset, the reviewed
public default remains `kaori-website`,
`/var/lib/kaori-website/deploy-state`, and `127.0.0.1:18080`.
For an independently named Website project, state must be rooted at
`/var/lib/<project>/deploy-state`, must exist and be writable, and
the loopback port must be unique on the selected host. The legacy
private `kaori-website-uat` namespace remains reserved to its
separate historical adapter.

The current shared-edge attachment path remains authorized only for
the canonical `kaori-website` public runtime; a noncanonical target
may be deployed privately after operator provisioning and explicit
authorization, but a different public route requires a separately
approved provider-owned edge configuration. Neither this work nor production
reconciliation changes GitHub Environment branch policies or automatically
enables deployment.

### Manual release fallback — Website #240

Manual `Release Candidate` and `Release Deployment` workflows now run
**only** via `workflow_dispatch` on protected `kaori/staging`. Both jobs
bind GitHub Environment `staging`, using its scoped target configuration,
secrets, approval rules, and the existing resource concurrency groups.
Historical push triggers on `kaori/rc-request` and `kaori/uat-request`
are retired, along with duplicate repository-scoped per-RC UAT variables.

Use the automatic `quality.yml` staging release path when enabled by the
operator. Manual fallback requires the exact admitted source, unique
signed immutable RC, explicit release approval URL, and reviewed public
edge authorization; it never bypasses source/digest, pinned SSH, health,
or rollback checks. Protected `production` remains a separate main
promotion Environment with its own approval and deployment target.

### Stable target reconciliation — Website #239

The protected `main` workflow selects its deployment target from GitHub
Environment `production`. Operators may point both Environments at the
same Website runtime or configure distinct targets. There is no slot mode.

The stable publisher verifies the accepted signed RC digest and its
SBOM/provenance before reconciling the configured runtime.

- **Digest already running:** verify health, receipt and rollback; do not redeploy.
- **Different healthy digest:** reuse the existing signed-RC deployment adapter.
- **After replacement:** reverify the exact digest before publishing stable.
- **Unmanaged runtime:** reject missing receipts, unhealthy containers and invalid identity.
- **Public routing:** use only the previously approved canonical Website edge.

### Digest-bound stable versus immutable build footer — Website #278

**Trusted source split:** The signed OCI image retains `APP_VERSION=vX.Y.Z-rc.N` and a build-time `PUBLIC_KAORI_WEBSITE_BUILD_SHA`. The static HTML always reports `Website build vX.Y.Z-rc.N`; never rewrite these signed bytes or strip `-rc.N` to fabricate stable. The protected host deploy adapter now atomically commits a public _active_ receipt `$KAORI_WEBSITE_STATE_DIR/release-metadata/active.json` **after** the container passes the exact image/digest/UID/health checks and `release.env` is committed. It includes only public build/source/digest identifiers. The directory is bind-mounted **read-only** into the unprivileged NGINX container at `/usr/share/nginx/html/.well-known/kaori-website`.

Only the independently reviewed **production Environment** stable promotion, **after** successful GitHub stable Release publication and verified exact host image/receipt/attestations, may atomically commit `release-metadata/release.json`. It contains `schema=1`, `status=stable`, reviewed stable/build versions, accepted RC source SHA, signed image digest, main SHA and GitHub publication time. The promotion repeats host receipt/image/health/read-only mount/active metadata validation and performs an actual NGINX readback; an unsuccessful metadata commit fails the release workflow explicitly **even if GitHub already published the stable release**, in which case rerun the same authorized idempotent release after correction. There is no rebuild/retag.

The browser fetches only **same-origin**, no-store `/.well-known/kaori-website/active.json` and `release.json`. It shows `Website stable vX.Y.Z` only when both receipts match one another **and** the immutable embedded RC build tag/source SHA and digest syntax; it always preserves the separate build label. An absent, unreadable, stale, malformed or mismatched receipt yields `Stable release not verified`. A newer RC on the same public slot changes `active.json` and thus invalidates the previous `release.json`; a rollback also commits the recovered active image, so an unrelated stable cannot be displayed. A fresh signed candidate has no stable label until protected production publication. Browser JavaScript never queries GitHub, Docker, or protected registry credentials per visitor, and cannot itself independently verify a cryptographic OCI signature; host publication and approved producer attestations remain authoritative.

**Historical #278 implementation checkpoint (before RC.1 publication):** The then-live **v0.1.3** container was built before this source change and still embedded RC.2; neither its OCI bytes nor its running config are modified by merging #278. The new presentation is accepted only after signed next RC, independent host UAT, visual/accessibility evidence, protected promotion and explicit stable production Environment approval. Operator evidence must include `curl -fLsS https://kaori.cloud/.well-known/kaori-website/active.json` and `release.json` **after** publishing stable, matching exact signed digest/receipt, while preserving previous signed rollback state. NGINX returns `Cache-Control: no-store`, and does not expose host state or secret directories.

The OCI image retains its original `-rc.N` build label. The stable
`vX.Y.Z` name is release metadata, not a reason to rebuild or retag.

A new VM still requires host commissioning and independent UAT.
Noncanonical routing and a missing prior receipt are not auto-approved.
Provider-owned DNS, TLS and shared-edge registration are outside this job.
See [#234](https://github.com/OXY7O/kaori-website/issues/234) and
[#239](https://github.com/OXY7O/kaori-website/issues/239).

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

### Static Website image boundary — #277

The release image uses an explicit multi-stage build. Node.js exists **only in the builder**. The pinned `nginx-unprivileged` Alpine runtime receives the generated `/build/dist/` static site and reviewed `deploy/server/nginx.conf`; it does not copy the source tree or Node/npm packages. The root `.dockerignore` is **default deny** and re-includes only the Dockerfile/build metadata, `package.json` / lockfile, Astro/TypeScript/Prettier config, `src/**`, `public/**` and `deploy/server/nginx.conf`. `.git/`, `.github/`, `.devcontainer/`, `docs/`, `tests/`, scripts, host deploy files and environment files must not be sent as build context or present in the final image. The public license notices under `public/licenses/` remain **intentionally included** in the static output.

The common `deploy/server/compose.website.yml` enforces UID/GID `101:101`, `cap_drop: [ALL]`, read-only root, `no-new-privileges`, a bounded `/tmp` mount using `noexec,nosuid`, PID/CPU/memory limits, restricted network and localhost release/UAT overlays. HTTP 8080 needs no privileged port-binding capability. Existing Docker default seccomp/LSM policies still depend on the actual **host**; do not claim they are configured without `docker inspect` or host evidence. Release Docker image UID and application process UID are **not** proof the Docker Engine itself runs in rootless mode.

Review these non-secret checks on an authorized host with the correct Docker context:

```bash
docker info --format '{{json .SecurityOptions}}'
docker compose -f deploy/server/compose.website.yml config --format json
docker image inspect --format '{{.Config.User}} {{index .Config.Labels "org.opencontainers.image.version"}}' IMAGE@sha256:DIGEST
docker inspect CONTAINER --format '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{json .HostConfig.CapDrop}} {{json .HostConfig.SecurityOpt}}'
docker exec CONTAINER sh -c "grep -E '^(CapEff|NoNewPrivs):' /proc/self/status"
```

Replace `IMAGE@sha256:DIGEST` and `CONTAINER` with the **exact selected signed release image/container**; do not run a deployment to gather read-only evidence. The Docker engine's `rootless` SecurityOption is a host-level decision and may require a separate test of networking, cgroup delegation, release runner socket, and SSH deployment. The current NGINX Alpine runtime is **not distroless** and deliberately retains a shell/`wget` for existing health and operational verification; switching to a shell-less image would require replacing those probes, independent base supply-chain review and a separate host-sensitive UAT (#279).

After any security-sensitive source change, require the existing `scripts/container_smoke.sh` checks (image UID, `CapEff=0`, `NoNewPrivs=1`, minimal static image contents, NGINX HTTP health), Trivy HIGH/CRITICAL, signed SBOM/provenance and protected admission gates. A passing Docker smoke is not a public Website or Human UAT acceptance. Keep the previously signed v0.1.3 digest unchanged until a **new independently approved** RC and explicit production release; rollback must use the prior accepted digest and verified receipt, not a rebuilt image.

## Predeployment prerequisites (verify for each release)

1. Review SSH identity and permissions for a **separate website deployment identity**. Follow KAORI's `kaori-deploy` trust practices; do not repurpose or overwrite its private key, registration or server runtime.
2. Confirm allocated CPU/memory, Docker resource limits and available container/registry storage. The shared VPS may also host the self-hosted CI runner.
3. Prepare the above app and state directories with restricted ownership; verify no naming/Compose project collision.
4. Confirm the approved hostname split: `kaori.cloud` serves the website; `app.kaori.cloud` serves KAORI Application. Verify current edge registrations and obtain cutover authority before changing the apex.
5. Verify exact staging SHA, completed website Full Admission and immutable digest; ensure OCI labels match SHA and SemVer candidate.
6. This repository is **public** and the maintainer reports both `staging`
   and `production` GitHub Environments have been created. Before enabling
   automation, an administrator must verify their deployment branch policies,
   required reviewers, self-review/bypass restrictions, and intended scoped
   variable/secret names. Keep the host SSH key pinned and the deployment
   adapter's separate SSH trust boundary; never substitute a runner-local
   Docker deployment shortcut.
7. Every release candidate retains verified SBOM, Trivy HIGH/CRITICAL results, provenance, signing and immutable registry identity before deployment; successful earlier release evidence does not transfer to a new SHA.

## Repository Actions configuration

The manual candidate publisher and deployment fallback retain issue-scoped
authorization. Staging RC admission and explicitly dispatched production release
jobs bind to protected GitHub Environments `staging` and `production`.
Configuration Variables are read through step-level `vars.*` mappings
**after** the Environment boundary; runtime credentials are Environment-scoped
Secrets, not repository Secrets. The only active automated release activation
switch is `KAORI_WEBSITE_AUTO_STAGING_ENABLED` (staging), default `false`.
The historical `KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED` value is **unused**;
neither editing it nor approving a source PR initiates production release.
Production release requires explicit manual dispatch, independent protected
review, and accepted signed evidence.

- Required Variables in **each** Environment: `KAORI_WEBSITE_DOCKER_REGISTRY_HOST`, `KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE`, `KAORI_WEBSITE_HOST`, `KAORI_WEBSITE_HOST_PORT`, `KAORI_WEBSITE_HOST_USER`, and `KAORI_WEBSITE_HOST_DEPLOY_ROOT`.
- Optional Environment target overrides: `KAORI_WEBSITE_COMPOSE_PROJECT`, `KAORI_WEBSITE_STATE_DIR`, `KAORI_WEBSITE_LOOPBACK_PORT`, and `KAORI_WEBSITE_ATTACH_EXISTING_EDGE`, only for approved target topology.
- Secrets scoped to the Environment: `KAORI_WEBSITE_DOCKER_REGISTRY_USERNAME`, `KAORI_WEBSITE_DOCKER_REGISTRY_PASSWORD`, `KAORI_WEBSITE_HOST_SSH_PRIVATE_KEY`, `KAORI_WEBSITE_HOST_SSH_PASSPHRASE` when required, and `KAORI_WEBSITE_HOST_KNOWN_HOSTS` pinned out of band.
- `KAORI_WEBSITE_PUBLIC_DOMAIN` is a retired repository-level value; current release workflows do not consume it. The canonical public domain and edge acceptance remain governed by the reviewed deployment adapter and provider-owned routing.

**Completed repository cleanup — Website #247:** Required Variables and
Secrets were verified in both protected Environments and their read-only
credential/SSH preflights succeeded. All nine old **repository-scoped** Actions
Variables were deleted by the authorized operator with authenticated readback
of zero repository Variables and zero Secrets. Environment-scoped credentials
remain intact. The retired production auto-activation variable may still
exist in Environment settings but is **not** read by the explicit production
release workflow; it is not a release gate or permission. Preserve the
no-mutation evidence from the cleanup issue.

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

## Planned automatic staging UAT on the existing public slot — #202

**Source checkpoint, 2026-11-17:** Approved PR #205 merged to staging; Full Admission #44006999386 passed 4/4. Its RC publication and deployment jobs both SKIPPED. Live automatic release and new Human UAT are unverified.

The maintainer accepts one current public Website runtime (`https://kaori.cloud`)
for staging signed RC and approved production stable releases. The runtime
does not split until separate infrastructure becomes available; GitHub
`staging` and `production` are logical **governance** Environments, not
additional hostnames or Compose projects.

Following independent merge and exact-source admission of PR #205, the existing
\`quality.yml\` runs four required jobs. The optional admitted staging
publisher/deployer becomes active **only** after a repository administrator
configures and authorizes \`KAORI_WEBSITE_AUTO_STAGING_ENABLED=true\`. It
then selects a unique signed RC, builds/scans/signs, commits evidence and
deploys the immutable digest to the existing \`kaori-website\` project,
reusing the same shared-edge registration, rollback receipt and readiness
checks as the approved RC.9 public deployment. Deployment claims must come
from actual GitHub Actions plus host evidence. Human Visual UAT remains
a separate documented acceptance step.

**Before enabling:** verify GitHub Environment \`staging\` exists and only
permits \`kaori/staging\`, required reviewers are disabled for automatic
staging, allowed self-hosted runner and scoped secret names are correct,
the current public digest/rollback are healthy, and KAORI #4212 has an
explicitly accepted _ongoing_ publication/rights boundary. With the
activation flag absent/false this proposed flow **does not publish or deploy**.
Legacy RC/Deployment manual workflows remain available for separately
approved recovery until replacement evidence is accepted. If a newer staging
SHA appears during publication/deployment, stop rather than publish stale RC.

**Shared slot warning:** staged RC is visible to public users immediately
after automatic deployment; production approval does **not** gate initial
visibility. The production Environment (integrated source in PR #206) is designed to
approve stable release identity and verify the same digest, without
rebuilding or changing DNS/TLS. A newer staging RC after production
approval request invalidates that pending live acceptance.

## Planned stable production approval using the existing one-slot runtime — #203

**Source checkpoint, 2026-11-17:** Reviewed PR #206 merged into protected staging and published/deployed signed `v0.1.2-rc.10` on the sole public Website slot. Its exact OCI digest, technical readiness and live license-file notices passed; the maintainer explicitly **APPROVED** the RC.10 Human UAT in [Website #202](https://github.com/OXY7O/kaori-website/issues/202#issuecomment-6939870730). Subsequent approved #209/#207 staging source-only changes do **not** revoke that historical signed RC acceptance or require another RC. A governed production promotion has **not** occurred. The audited previous signed rollback identity, actual protected production reviewer behavior and rights for future recurring publication [KAORI #4939](https://github.com/OXY7O/KAORI/issues/4939) remain separate.

The approved operating topology is **two GitHub Environments, one active public
Website runtime**. Staging signed RCs may already be exposed at
`https://kaori.cloud` before the protected production approval. Production is
an **acceptance and stable metadata** operation on the same installed RC
digest, not a second server/Compose project or a forced redeployment.

**Current release authorization correction (Website #257, 2026-11-22):**
The original #201/#203 workflow queued `production` approval after every
`push main`, even when no release was requested. This is **superseded**.
Now an issue-scoped code change can be merged to staging and promoted to
`main` without requesting any production Environment approval or release.
A manually requested stable release remains a separate, audited event.

**Operator/admin configuration:** In repository Settings → Environments,
restrict `production` to `main`, designate independent required reviewer(s),
prevent self-review, and disallow administrator bypass. Keep protected
Environment-scoped registry/SSH Variables and Secrets. Confirm an ordinary
source-only `main` push has no production Environment job; a manually dispatched
`release-production.yml` run alone requests the approval. Do not enable the
retired production auto-activation switch; it is not consumed by the workflow.

**Normal source and release flow:**

1. Review/merge work to `kaori/staging` and pass Full Admission. An
   authorized staging release produces a signed immutable
   `vX.Y.Z-rc.N` and deploys the configured staging target for
   independent browser/live/rollback UAT. No RC is implicitly stable.
2. After release-bound Human Acceptance, an authorized maintainer records
   `KAORI_WEBSITE_UAT_ACCEPTED:<staging SHA>:<RC tag>:<sha256 digest>`
   in the appropriate Website issue comment. The accepted RC's source SHA,
   signed image/digest, manifest, provenance and rollback must be known.
3. Review the official `kaori/staging → main` promotion PR with independent
   current-head approval. Include exactly one literal
   `Human UAT evidence: https://github.com/OXY7O/kaori-website/issues/<issue>#issuecomment-<comment>`
   line in its body. Subsequent docs-only source promotion is allowed if
   git ancestry and all shipped Website inputs remain unchanged.
4. Merge to protected `main` and verify exact-main Full Admission 4/4 and
   relevant GitHub CodeQL security gates. **Stop here unless the maintainer
   explicitly requests a production release.** No production reviewer prompt,
   stable GitHub Release or production deployment happens on a main push.
   Prepare public release notes as **reviewable source**, not inside a
   privileged release job: generate a read-only categorized PR draft via
   `bash scripts/release/prepare-notes.sh vX.Y.Z`. Edit the narrative into
   `docs/releases/vX.Y.Z.md` with required **Highlights**, **Improvements**,
   **Fixes**, **Known Limitations** and frontmatter
   `stable_tag: vX.Y.Z` plus `promotion_pr: 123` (the actual approved
   staging→main source PR). Submit the notes through an issue-linked PR,
   independently review, pass staging/main admission. Notes added after a
   signed RC are documentation-only and never replace its trusted UAT.
5. Once the maintainer actually requests release, dispatch **Production Release**
   on `main` with **only** the intended stable `vX.Y.Z`. The reviewed
   notes metadata provides the authorized source promotion PR automatically.
   Example only, with a placeholder stable version:

   ```bash
   gh workflow run release-production.yml -R OXY7O/kaori-website --ref main \
     -f stable_tag=vX.Y.Z
   ```

   The unprivileged request gate verifies the authored version-specific
   release notes, derives the promotion PR, checks permitted initiator, exact
   current main Full Admission, reviewed promotion and Human UAT reference
   **before** requesting native `production` Environment approval.
   Missing, placeholder, mismatched or unreviewed notes fail closed.

6. After Doni/another authorized independent reviewer approves that
   **specific release run**, the restricted runner revalidates independent
   source review, signed RC/Digest/SBOM/provenance, the trusted UAT marker,
   no runtime input drift, exact current main, host SSH trust, current release
   receipt, rollback and authorized public edge. If target digest already
   matches, do **not** redeploy the same image; if the prepared target differs,
   deploy the exact **same signed immutable OCI digest** via the existing
   receipt-backed adapter, then verify host and Website/App/Docs HTTPS.
7. Only after the configured production target is verified/reconciled, create
   stable GitHub Release/tag `vX.Y.Z` bound to approved `main`, publishing
   the **reviewed, user-friendly release description first**, followed by a
   separately generated **Technical Evidence** section: signed original RC
   digest/provenance, source SHA, UAT, promotion PR and native production
   approval run. `CHANGELOG.md` lists published stable versions only;
   synchronize it through a reviewed documentation PR if the release was
   finalized after the original notes PR. **Stable tag is not `-rc.N`.**
   No new Docker build or mutable retag occurs.
   The signed image's original RC **build** label and static footer remain
   immutable provenance; they must not be confused with the separately
   governed `vX.Y.Z` stable GitHub Release identity.

**Failure and recovery:** A failed explicit request, missing UAT, approval
rejection, stale/different unhealthy target, wrong signed digest or missing
rollback evidence fails closed; no stable tag should be created. A prepared
healthy target with a different accepted digest may be reconciled only through
the existing governed adapter and separate target/edge authorization. Reconcile
signed RC/Human UAT evidence and request a new reviewed release as needed;
never force main, rewrite a tag or bypass independent Environment review.
The shared `kaori-website-release-deploy` concurrency group serializes
production with staging deployment of the same public Website slot. Shared-edge,
DNS/TLS and App/Docs infrastructure remain outside this workflow.

## Release deployment dispatch (manual only)

Once a unique prerelease for the current admitted staging SHA exists, an operator may dispatch `deploy-staging-host.yml` from `kaori/staging`, providing the exact `candidate_tag` and a link to explicit maintainer authorization (`approval_reference`). The workflow validates GitHub RC evidence for the exact SHA/image digest,
checks its authorized credentials without printing them, verifies pinned SSH
host trust and transfers the reviewed adapter through a distinct deployment
identity. This is a **manual recovery path**, never an implicit bypass of
staging admission, public-slot authorization or required production
Environment review. No feature-branch dispatch is an automatic deployment.

**Special-purpose host-security exception ONLY (#284), not normal public Website Human UAT:** For a signed RC that has already passed protected staging Full Admission, an explicitly authorized manual `deploy-staging-host.yml` dispatch with `publish_existing_edge=false` now selects the existing **separate** Compose project `kaori-website-uat` and `/opt/kaori-website/uat/deploy-state`, with only `127.0.0.1:18083:8080` exposed to the host and no `edge-public` attachment. The adapter uses its existing UAT guards: pinned host trust, exact signed RC SHA/digest, separate path/symlink/port and minimum capacity checks, pre/post public container identity and health, signed release receipt/rollback, plus non-root/zero-capability process verification. This **still mutates the isolated UAT container and host state**, so obtain explicit operator authorization and valid release-specific signed candidate evidence first; a green CI check alone is insufficient. The UAT shares the host kernel and Docker daemon; it is not a separate VM or a security sandbox.

Use the existing workflow with protected branch `kaori/staging`, exact immutable `candidate_tag`, `approval_reference=https://github.com/OXY7O/kaori-website/issues/284` **only after** the maintainer has explicitly authorized the host test, and `publish_existing_edge=false`. A public-slot replacement with `publish_existing_edge=true` is a separately authorized action, not an alternative UAT default. Follow the existing `verify.sh` and recorded production baseline: all NGINX processes must remain UID/GID 101, `CapEff=0`, `CapBnd=0`, `NoNewPrivs=1`; capture actual image digest, 18083 loopback health, restored prior UAT receipt if needed, and confirm `kaori-website/web` public container ID/digest/health remains unchanged before declaring security-sensitive UAT ready for Human Acceptance.

## Legacy public UAT request fallback — #195

This is the previously approved request-branch contract that superseded
#122/#124 private-only behavior. It remains separately governed while the
new #202 admission-gated staging train is not activated or proven. Once that
train is accepted, this procedure is **fallback only**, not routine release
or a competing path around GitHub Environments. Historical private RC.8
records remain evidence, not current default behavior.

1. Obtain exact accepted `kaori/staging` SHA, successful all-lanes Full Admission,
   one matching signed RC tag, immutable OCI digest/SBOM/provenance and successful
   publisher. Record a **separate issue** whose body explicitly contains
   `Public UAT authorization: APPROVED`, `Source SHA: <sha>`, and
   `RC tag: <tag>`, plus the intended one-slot replacement and previous
   signed rollback identity. Approval is a real maintainer decision, not a
   PR merge or an implicit result of CI PASS.
2. Before moving `kaori/uat-request`, set the three release-scoped repository
   Actions variables `KAORI_WEBSITE_PUBLIC_UAT_APPROVED_SHA`,
   `KAORI_WEBSITE_PUBLIC_UAT_APPROVED_TAG`, and
   `KAORI_WEBSITE_PUBLIC_UAT_APPROVAL_ISSUE` to those exact values. Check the
   issue and variable setter are authorized. Missing or stale values fail
   closed before the pinned SSH boundary.
3. Non-force fast-forward `kaori/uat-request` to that accepted SHA.
   The existing Release Deployment workflow verifies the exact source,
   one signed RC, successful publisher, merged staging PR and the recorded
   approval. It uses **the existing** public `kaori-website` Compose project,
   its release receipts in `/var/lib/kaori-website/deploy-state`, the existing
   loopback `127.0.0.1:18080`, and `edge-public` registration. It does
   **not** use `kaori-website-uat` as the normal request-branch target.
   The deploy adapter preflights current shared-edge registration before
   replacing the live container, retains signed rollback and checks trusted
   `kaori.cloud`, Application and Docs HTTPS after attachment.
4. Verify the **actual public** version footer, digest, HTTPS/TLS/Host-SNI,
   navigation/CTA, desktop/tablet/mobile, light/dark, keyboard/accessibility
   and third-party notices where relevant; record separate **Human UAT
   PASS/FAIL**. Never conflate successful GitHub Actions with acceptance.
   A failed public replacement follows the existing scoped rollback and
   shared-edge recovery instructions, not a fresh image build or new edge.
5. Rotate/clear the per-RC approval variables after completion. Stable/main
   promotion, source relicensing, repository rights clearance, DNS/TLS
   ownership changes and cleanup of the older private UAT project remain
   separate approved workstreams.

**Critical historical exception:** Signed RC.8 was deployed privately under
[#194](https://github.com/OXY7O/kaori-website/issues/194) before this behavior
changed. That approval was **private only** and does not authorize moving
RC.8 onto the public `kaori.cloud` slot. Applying the new contract requires
a new signed post-merge source revision plus explicit per-release cutover
authorization. Parent [KAORI #4212](https://github.com/OXY7O/KAORI/issues/4212)
remains the separate public-source rights audit authority.

## Historical private release browser access — retired for normal UAT

The initial Website deployment used a loopback-only Compose override and an
SSH browser tunnel before the public shared-edge route was accepted. That
approach is **retired as normal Human UAT**. Do not establish a browser tunnel
or substitute `http://127.0.0.1:18080/` or `127.0.0.1:18083` for acceptance
through `https://kaori.cloud`.

The original commands and rationale remain auditable in Git history and the
historical [private RC.8 issue #194](https://github.com/OXY7O/kaori-website/issues/194).
The approved public-domain transition is [#195](https://github.com/OXY7O/kaori-website/issues/195),
with current release-specific approval and acceptance under
[#288](https://github.com/OXY7O/kaori-website/issues/288). Internal loopback
health verification and the separately authorized #284 security-only host test
remain valid safety gates, **not private browser acceptance workflows**.

## Repository image namespace preflight for issue #10

The first release candidate publication attempt failed at the required Trivy vulnerability gate; it did not publish an OCI tag or deploy to VPS. A separate security workstream #12 updated the runtime image and enforced a release-equivalent Trivy check during Docker smoke. The protected Environment Variable `KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE` is **an operator-owned prerequisite**: it MUST end with `/kaori-website`, separate from the KAORI Application image. Both publisher and SSH deployment adapter now reject other image repository paths. Current publisher and release deployment preflight checks require this namespace; correction evidence is recorded in issue #10.

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

## Retired read-only Environment credential preflight — #239 / #247 / #260

The one-time `Environment Credential Preflight` GitHub Actions workflow was
retired under Website #260 **after** the completed Environment-scoped
credential migration and two independent read-only checks:

- [Staging preflight #44953987203](https://github.com/OXY7O/kaori-website/actions/runs/44953987203): SUCCESS.
- [Production preflight #44953991481](https://github.com/OXY7O/kaori-website/actions/runs/44953991481): SUCCESS, after native protected reviewer approval.

Both checked the approved Environment-scoped registry configuration, pinned
SSH host identity, prepared VM, existing release receipt and Docker access
**without publishing, deploying, changing DNS, or mutating host state**.
Historical workflow runs are preserved as audit evidence; the YAML is no longer
part of normal GitHub Actions or release readiness gates. Do **not** dispatch
`environment-credential-preflight.yml`: it has been removed from active source.

The read-only diagnostic shell implementation
`scripts/environment-credential-preflight.sh` is intentionally retained as
an archived operator utility, **not** a workflow trigger or an automatic release
prerequisite. Running it requires a separately authorized, appropriately
protected execution context and configured credentials; normal source checks
must never execute it or expose secrets.

Current release controls are the existing Developer Check, protected
Full Admission, accepted signed RC/UAT evidence and the explicit
`release-production.yml` workflow with independent native production
Environment approval. A past credential preflight PASS is not a perpetual
validation of secrets, runtime health, rollback, DNS or deployment authority.
If new host/registry credentials need validation, open a bounded issue and use
an authorized read-only operator procedure; do not reintroduce a public
GitHub Actions workflow just to test production connectivity.
