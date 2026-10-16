#!/usr/bin/env bash
set -Eeuo pipefail
[[ ${1:-} =~ ^[a-f0-9]{40}$ ]] || { echo 'BLOCK: exact source SHA required' >&2; exit 1; }
source_sha="$1"
test "$(git rev-parse HEAD)" = "$source_sha" || { echo 'BLOCK: checked out SHA mismatch' >&2; exit 1; }
docker info >/dev/null
docker compose version >/dev/null
export KAORI_WEBSITE_IMAGE="example.invalid/kaori-website@sha256:$(printf '%064d' 0)"
docker compose -f deploy/server/compose.website.yml config --quiet
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
printf 'PASS: static Docker container starts non-root, read-only, no host ports or edge changes\n'
