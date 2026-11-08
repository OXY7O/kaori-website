#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:-}"
[[ "$mode" == preflight || "$mode" == attach ]] || {
    echo 'BLOCK: expected preflight or attach' >&2
    exit 1
}
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }

# Public-domain ownership remains in the existing shared-edge registration.
# This script never writes Nginx, Certbot, DNS, or edge registration files.
site="/opt/shared-edge/config/sites/kaori-website.env"
[[ -f "$site" && ! -L "$site" && -r "$site" ]] ||
    fail 'reviewed website shared-edge registration is missing or unreadable'
for required in \
    'EDGE_DOMAIN=kaori.cloud' \
    'EDGE_UPSTREAM=kaori-website-web' \
    'EDGE_UPSTREAM_PORT=8080' \
    'EDGE_HEALTH_PATH=/healthz' \
    'EDGE_TLS=true'; do
    grep -Fxq "$required" "$site" ||
        fail 'shared-edge registration differs from approved website contract'
done
docker network inspect edge-public >/dev/null ||
    fail 'approved edge-public Docker network unavailable'
command -v curl >/dev/null || fail 'curl is required for HTTPS acceptance'

if [[ "$mode" == preflight ]]; then
    printf 'PASS: existing website domain authority and edge network verified\n'
    exit 0
fi

mapfile -t containers < <(
    docker ps --filter label=com.docker.compose.project=kaori-website \
        --filter label=com.docker.compose.service=web --format '{{.ID}}'
)
[[ "${#containers[@]}" -eq 1 ]] || fail 'expected exactly one website web container'
container="${containers[0]}"
health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")"
[[ "$health" == healthy ]] || fail "website container is not healthy: $health"
attached="$(docker inspect --format '{{if index .NetworkSettings.Networks "edge-public"}}true{{else}}false{{end}}' "$container")"
if [[ "$attached" != true ]]; then
    docker network connect --alias kaori-website-web edge-public "$container" ||
        fail 'unable to attach the new website container to existing edge'
fi

public_ready=false
for attempt in $(seq 1 20); do
    if [[ "$(curl -fsS --max-time 7 https://kaori.cloud/healthz 2>/dev/null || true)" == healthy ]]; then
        public_ready=true
        break
    fi
    sleep 3
done
[[ "$public_ready" == true ]] ||
    fail 'public apex did not route to the new healthy website; shared-edge owner must reconcile using existing apply.sh'

# Public health alone can pass against a stale upstream. Match the rendered footer
# to the selected container's immutable OCI version identity before acceptance.
image_version="$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$container")"
[[ "$image_version" =~ ^[0-9]+[.][0-9]+[.][0-9]+(-rc[.][1-9][0-9]*)?$ ]] ||
    fail 'current website container has no valid immutable OCI version label'
public_home="$(curl -fsS --max-time 15 https://kaori.cloud/)" ||
    fail 'public Website HTML could not be retrieved over trusted HTTPS'
grep -Fq "Website build v${image_version}" <<<"$public_home" ||
    fail "public Website build identity does not match selected image v${image_version}; check shared-edge upstream and cache"
printf 'PASS: public Website footer matches selected immutable build v%s\n' "$image_version"

app_ready="$(curl -fsS --max-time 10 https://app.kaori.cloud/health/ready)" ||
    fail 'application HTTPS readiness changed after website reattachment'
[[ "$app_ready" == *'"status":"ready"'* ]] ||
    fail 'application readiness did not indicate ready'
# Docs replaced the retired n8n public site as the third active shared-edge service.
# Keep this a mandatory trusted-HTTPS readiness check; never bypass TLS failures.
curl -fsS --max-time 10 https://docs.kaori.cloud/healthz >/dev/null ||
    fail 'Docs HTTPS readiness changed after website reattachment'
printf 'PASS: existing kaori.cloud edge attached to accepted healthy website\n'
printf 'PASS: app.kaori.cloud and docs.kaori.cloud HTTPS readiness retained\n'
