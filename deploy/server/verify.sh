#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose_file="${KAORI_WEBSITE_COMPOSE_FILE:-$script_dir/compose.website.yml}"
expected_image="${KAORI_WEBSITE_IMAGE:?Set KAORI_WEBSITE_IMAGE to the accepted digest-qualified image}"
[[ "$expected_image" =~ @sha256:[a-f0-9]{64}$ ]] || { echo 'BLOCK: digest-qualified image required' >&2; exit 1; }
command -v docker >/dev/null || { echo 'BLOCK: Docker is not available' >&2; exit 1; }
container="$(docker compose -f "$compose_file" ps -q web)"
[[ -n "$container" ]] || { echo 'BLOCK: website container missing' >&2; exit 1; }
image="$(docker inspect --format '{{.Config.Image}}' "$container")"
[[ "$image" == "$expected_image" ]] || { echo "BLOCK: expected $expected_image, found $image" >&2; exit 1; }
# Compose returns before the healthcheck has completed. Wait within a bounded window.
status='starting'
for attempt in $(seq 1 30); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")"
    [[ "$status" == healthy ]] && break
    [[ "$status" == unhealthy || "$status" == missing ]] && break
    sleep 3
done
[[ "$status" == healthy ]] || { echo "BLOCK: website health $status" >&2; exit 1; }
uid="$(docker exec "$container" id -u)"
[[ "$uid" != 0 ]] || { echo 'BLOCK: website process runs as root' >&2; exit 1; }
docker exec "$container" wget -q -O - http://127.0.0.1:8080/healthz | grep -Fxq healthy
docker exec "$container" wget -q -O - http://127.0.0.1:8080/ | grep -qi KAORI
printf 'PASS: isolated website digest, health and non-root HTTP response verified\n'
printf 'Container: %s\nImage: %s\n' "$container" "$expected_image"
