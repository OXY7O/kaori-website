#!/usr/bin/env bash
set -Eeuo pipefail
[[ ${1:-} =~ ^[a-f0-9]{40}$ ]] || { echo 'BLOCK: exact source SHA required' >&2; exit 1; }
source_sha="$1"
test "$(git rev-parse HEAD)" = "$source_sha" || { echo 'BLOCK: checked out SHA mismatch' >&2; exit 1; }
docker info >/dev/null
docker compose version >/dev/null
export KAORI_WEBSITE_IMAGE="example.invalid/kaori-website@sha256:$(printf '%064d' 0)"
docker compose -f deploy/server/compose.website.yml config --quiet
docker compose -f deploy/server/compose.website.yml -f deploy/server/compose.release.yml config --quiet
# Check effective shared Compose policy; UAT and release overlays must inherit it.
base_config="$(docker compose -f deploy/server/compose.website.yml config --format json)"
[[ "$base_config" == *'"user": "101:101"'* ]] || { echo 'BLOCK: runtime UID/GID must be unprivileged' >&2; exit 1; }
[[ "$base_config" == *'"cap_drop": ['* && "$base_config" == *'"ALL"'* ]] ||
  { echo 'BLOCK: runtime must drop all ambient Linux capabilities' >&2; exit 1; }
[[ "$base_config" == *'"read_only": true'* && "$base_config" == *'no-new-privileges:true'* ]] ||
  { echo 'BLOCK: runtime must be read-only and disallow privilege escalation' >&2; exit 1; }
# Release remains loopback-only with a separate publishable bridge; no host 0.0.0.0.
config="$(docker compose -f deploy/server/compose.website.yml -f deploy/server/compose.release.yml config --format json)"
printf '%s' "$config" | grep -Fq '"host_ip": "127.0.0.1"' || { echo 'BLOCK: Release host binding not localhost-only' >&2; exit 1; }
printf '%s' "$config" | grep -Fq '"website-release-loopback"' || { echo 'BLOCK: Release ingress bridge missing' >&2; exit 1; }
# The staging/UAT project must be a separate loopback-only container, not the live Website.
uat_config="$(COMPOSE_PROJECT_NAME=kaori-website-uat docker compose \
  -f deploy/server/compose.website.yml -f deploy/server/compose.uat.yml config --format json)"
printf '%s' "$uat_config" | grep -Fq '"name": "kaori-website-uat"' ||
  { echo 'BLOCK: UAT Compose project identity incorrect' >&2; exit 1; }
printf '%s' "$uat_config" | grep -Fq '"published": "18083"' ||
  { echo 'BLOCK: UAT loopback port incorrect' >&2; exit 1; }
printf '%s' "$uat_config" | grep -Fq '"host_ip": "127.0.0.1"' ||
  { echo 'BLOCK: UAT must bind localhost only' >&2; exit 1; }
printf '%s' "$uat_config" | grep -Fq '"website-uat-loopback"' ||
  { echo 'BLOCK: dedicated UAT ingress network missing' >&2; exit 1; }
if printf '%s' "$uat_config" | grep -Fq 'edge-public'; then
  echo 'BLOCK: UAT must never join edge-public' >&2
  exit 1
fi

# The release metadata is NOT baked into the signed static OCI image.
# Exercise the exact read-only mount NGINX uses for a postpublication receipt.
metadata_fixture="$(mktemp -d)"
trap 'rm -rf -- "$metadata_fixture"' EXIT
chmod 0755 "$metadata_fixture"
printf '{"schema":1,"smoke":"receipt-only"}\n' > "$metadata_fixture/release.json"
chmod 0644 "$metadata_fixture/release.json"

image="kaori-website-smoke:${source_sha:0:12}"
docker build --target production \
  --build-arg APP_BUILD_SHA="$source_sha" \
  --build-arg APP_VERSION=0.1.0-rc.1 \
  --build-arg APP_BUILD_DATE=2026-01-01T00:00:00Z \
  --tag "$image" .
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")"
[[ "$revision" == "$source_sha" ]] || { echo 'BLOCK: OCI label source mismatch' >&2; exit 1; }
[[ "$(docker image inspect --format '{{.Config.User}}' "$image")" == '101:101' ]] ||
  { echo 'BLOCK: OCI runtime USER must be explicitly non-root' >&2; exit 1; }
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --mount "type=bind,source=$metadata_fixture,target=/usr/share/nginx/html/.well-known/kaori-website,readonly" \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh "$image" -ec '
    test "$(id -u)" = 101
    test "$(id -g)" = 101
    grep -Eq "^CapEff:[[:space:]]+0+$" /proc/self/status
    grep -Eq "^CapBnd:[[:space:]]+0+$" /proc/self/status
    grep -Eq "^NoNewPrivs:[[:space:]]+1$" /proc/self/status
    ! command -v node >/dev/null 2>&1
    ! command -v npm >/dev/null 2>&1
    for forbidden in /build /usr/share/nginx/html/node_modules \
      /usr/share/nginx/html/.git /usr/share/nginx/html/.github \
      /usr/share/nginx/html/.devcontainer /usr/share/nginx/html/docs \
      /usr/share/nginx/html/tests /usr/share/nginx/html/deploy \
      /usr/share/nginx/html/src; do
      test ! -e "$forbidden"
    done
    nginx -t
    nginx -g "daemon off;" &
    nginx_pid="$!"
    trap "kill $nginx_pid 2>/dev/null || true" EXIT
    attempts=0
    until wget -q -O - http://127.0.0.1:8080/healthz | grep -Fxq healthy; do
      attempts=$((attempts + 1))
      [ "$attempts" -le 20 ] || exit 1
      sleep 1
    done
    html="$(wget -q -O - http://127.0.0.1:8080/)"
    printf "%s" "$html" | grep -qi KAORI
    printf "%s" "$html" | grep -Fq "Website build v0.1.0-rc.1"
    status="$(wget -q -O - http://127.0.0.1:8080/.well-known/kaori-website/release.json)"
    test "$status" = "{\"schema\":1,\"smoke\":\"receipt-only\"}"
  '
# Image security is release-authoritative; fail early during Docker-path validation too.
docker run --rm --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume kaori-website-trivy-cache:/root/.cache/trivy \
  aquasec/trivy:0.74.0 image --cache-dir /root/.cache/trivy \
  --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL \
  --scanners vuln "$image"
printf 'PASS: static Docker container non-root, zero capabilities, no-new-privileges, read-only, minimal contents; no host ports or edge changes\n'
