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
# Release remains loopback-only with a separate publishable bridge; no host 0.0.0.0.
config="$(docker compose -f deploy/server/compose.website.yml -f deploy/server/compose.release.yml config --format json)"
printf '%s' "$config" | grep -Fq '"host_ip": "127.0.0.1"' || { echo 'BLOCK: Release host binding not localhost-only' >&2; exit 1; }
printf '%s' "$config" | grep -Fq '"website-release-loopback"' || { echo 'BLOCK: Release ingress bridge missing' >&2; exit 1; }

image="kaori-website-smoke:${source_sha:0:12}"
docker build --target production \
  --build-arg APP_BUILD_SHA="$source_sha" \
  --build-arg APP_VERSION=0.1.0-rc.1 \
  --build-arg APP_BUILD_DATE=2026-01-01T00:00:00Z \
  --tag "$image" .
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")"
[[ "$revision" == "$source_sha" ]] || { echo 'BLOCK: OCI label source mismatch' >&2; exit 1; }
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh "$image" -ec '
    test "$(id -u)" != 0
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
    wget -q -O - http://127.0.0.1:8080/ | grep -qi KAORI
  '
# Image security is release-authoritative; fail early during Docker-path validation too.
docker run --rm --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume kaori-website-trivy-cache:/root/.cache/trivy \
  aquasec/trivy:0.74.0 image --cache-dir /root/.cache/trivy \
  --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL \
  --scanners vuln "$image"
printf 'PASS: static Docker container starts non-root, read-only, no host ports or edge changes\n'
