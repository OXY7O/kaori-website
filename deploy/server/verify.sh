#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose_file="${KAORI_WEBSITE_COMPOSE_FILE:-$script_dir/compose.website.yml}"
runtime_env="${KAORI_WEBSITE_RUNTIME_ENV:-production}"
if [[ "$runtime_env" == uat ]]; then
    [[ "${COMPOSE_PROJECT_NAME:-}" == kaori-website-uat ]] || {
        echo 'BLOCK: UAT verification must use independent Compose project' >&2; exit 1;
    }
    expected_port=18083
else
    [[ "$runtime_env" == production ]] || { echo 'BLOCK: unknown runtime environment' >&2; exit 1; }
    expected_port=18080
fi
expected_image="${KAORI_WEBSITE_IMAGE:?Set KAORI_WEBSITE_IMAGE to the accepted digest-qualified image}"
[[ "$expected_image" =~ @sha256:[a-f0-9]{64}$ ]] || { echo 'BLOCK: digest-qualified image required' >&2; exit 1; }
command -v docker >/dev/null || { echo 'BLOCK: Docker is not available' >&2; exit 1; }
compose_args=(-f "$compose_file")
if [[ "${KAORI_WEBSITE_RELEASE_LOCAL_ONLY:-}" == 1 ]]; then
    if [[ "$runtime_env" == uat ]]; then
        override="$script_dir/compose.uat.yml"
    else
        override="$script_dir/compose.release.yml"
    fi
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
    [[ "$mapping" == "127.0.0.1:$expected_port" ]] || {
        echo "BLOCK: effective Docker port mapping must be exactly 127.0.0.1:$expected_port (found: ${mapping:-none})" >&2
        exit 1
    }
    command -v curl >/dev/null || { echo 'BLOCK: curl required for host-loopback release verification' >&2; exit 1; }
    ready=false
    for attempt in $(seq 1 15); do
        if [[ "$(curl --fail --silent --show-error --max-time 3 http://127.0.0.1:$expected_port/healthz 2>/dev/null)" == healthy ]]; then
            ready=true
            break
        fi
        sleep 2
    done
    [[ "$ready" == true ]] || { echo "BLOCK: host-loopback release health unavailable on 127.0.0.1:$expected_port" >&2; exit 1; }
    printf 'PASS: host-loopback mapping and HTTP health on 127.0.0.1:%s\n' "$expected_port"
fi
if [[ "$runtime_env" == uat ]]; then
    expected_version="${KAORI_WEBSITE_EXPECTED_VERSION:-}"
    [[ "$expected_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || {
        echo 'BLOCK: UAT expected signed RC build version missing' >&2; exit 1;
    }
    docker exec "$container" wget -q -O - http://127.0.0.1:8080/ |
        grep -Fq "Website build $expected_version" || {
        echo 'BLOCK: UAT footer build identity differs from accepted RC version' >&2; exit 1;
    }
    printf 'PASS: isolated UAT Website footer build version %s\n' "$expected_version"
fi
printf 'PASS: isolated website digest, health and non-root HTTP response verified\n'
printf 'Container: %s\nImage: %s\n' "$container" "$expected_image"
