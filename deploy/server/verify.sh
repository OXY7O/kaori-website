#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose_file="${KAORI_WEBSITE_COMPOSE_FILE:-$script_dir/compose.website.yml}"
expected_image="${KAORI_WEBSITE_IMAGE:?Set KAORI_WEBSITE_IMAGE to the accepted digest-qualified image}"
[[ "$expected_image" =~ @sha256:[a-f0-9]{64}$ ]] || { echo 'BLOCK: digest-qualified image required' >&2; exit 1; }
command -v docker >/dev/null || { echo 'BLOCK: Docker is not available' >&2; exit 1; }
compose_args=(-f "$compose_file")
if [[ "${KAORI_WEBSITE_RELEASE_LOCAL_ONLY:-}" == 1 ]]; then
    override="$script_dir/compose.release.yml"
    [[ -f "$override" && ! -L "$override" ]] || { echo 'BLOCK: missing trusted loopback override' >&2; exit 1; }
    compose_args+=(-f "$override")
fi
container="$(docker compose "${compose_args[@]}" ps -q web)"
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
if [[ "${KAORI_WEBSITE_RELEASE_LOCAL_ONLY:-}" == 1 ]]; then
    # Internal health does not prove the host published a loopback port.
    mapping="$(docker port "$container" 8080/tcp 2>/dev/null || true)"
    [[ "$mapping" == '127.0.0.1:18080' ]] || {
        echo "BLOCK: effective Docker port mapping must be exactly 127.0.0.1:18080 (found: ${mapping:-none})" >&2
        exit 1
    }
    command -v curl >/dev/null || { echo 'BLOCK: curl required for host-loopback release verification' >&2; exit 1; }
    ready=false
    for attempt in $(seq 1 15); do
        if [[ "$(curl --fail --silent --show-error --max-time 3 http://127.0.0.1:18080/healthz 2>/dev/null)" == healthy ]]; then
            ready=true
            break
        fi
        sleep 2
    done
    [[ "$ready" == true ]] || { echo 'BLOCK: host-loopback release health unavailable on 127.0.0.1:18080' >&2; exit 1; }
    printf 'PASS: host-loopback mapping and HTTP health on 127.0.0.1:18080\n'
fi
printf 'PASS: isolated website digest, health and non-root HTTP response verified\n'
printf 'Container: %s\nImage: %s\n' "$container" "$expected_image"
