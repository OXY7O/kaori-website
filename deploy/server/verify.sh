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
    project="${COMPOSE_PROJECT_NAME:-kaori-website}"
    [[ "$project" =~ ^kaori-website(-[a-z0-9][a-z0-9-]*)?$ &&
       "$project" != kaori-website-uat ]] || {
        echo 'BLOCK: production project must be a distinct Website namespace' >&2; exit 1;
    }
    expected_port="${KAORI_WEBSITE_LOOPBACK_PORT:-18080}"
    [[ "$expected_port" =~ ^[0-9]{4,5}$ ]] &&
        (( 10#$expected_port >= 1024 && 10#$expected_port <= 65535 )) || {
        echo 'BLOCK: production loopback port must be between 1024 and 65535' >&2; exit 1;
    }
fi
state_dir="${KAORI_WEBSITE_STATE_DIR:-/var/lib/${COMPOSE_PROJECT_NAME:-kaori-website}/deploy-state}"
metadata_dir="$state_dir/release-metadata"
[[ -d "$metadata_dir" && ! -L "$metadata_dir" ]] || {
    echo 'BLOCK: Website release metadata mount source missing or symlinked' >&2; exit 1;
}
export KAORI_WEBSITE_RELEASE_METADATA_DIR="$metadata_dir"
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
gid="$(docker exec "$container" id -g)"
[[ "$uid" == 101 && "$gid" == 101 ]] ||
    { echo 'BLOCK: website runtime UID/GID must be 101:101' >&2; exit 1; }
[[ "$(docker inspect --format '{{.Config.User}}' "$container")" == "101:101" ]] ||
    { echo 'BLOCK: Website configured runtime user is not 101:101' >&2; exit 1; }
[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$container")" == true ]] ||
    { echo 'BLOCK: Website root filesystem must be read-only' >&2; exit 1; }
[[ "$(docker inspect --format '{{.HostConfig.Privileged}}' "$container")" == false ]] ||
    { echo 'BLOCK: privileged Website container forbidden' >&2; exit 1; }
cap_drop="$(docker inspect --format '{{json .HostConfig.CapDrop}}' "$container")"
[[ "$cap_drop" == '["ALL"]' || "$cap_drop" == '["all"]' ]] ||
    { echo 'BLOCK: Website container must drop all Linux capabilities' >&2; exit 1; }
security_opts="$(docker inspect --format '{{json .HostConfig.SecurityOpt}}' "$container")"
[[ "$security_opts" == *no-new-privileges:true* ]] ||
    { echo 'BLOCK: no-new-privileges container policy missing' >&2; exit 1; }
mounts="$(docker inspect --format '{{json .Mounts}}' "$container")"
[[ "$mounts" != *docker.sock* ]] ||
    { echo 'BLOCK: Website runtime must not mount the Docker socket' >&2; exit 1; }
docker exec "$container" sh -ec '
    grep -Eq "^CapEff:[[:space:]]+0+$" /proc/self/status
    grep -Eq "^NoNewPrivs:[[:space:]]+1$" /proc/self/status
' || { echo 'BLOCK: effective Website process privileges differ from policy' >&2; exit 1; }
docker exec "$container" wget -q -O - http://127.0.0.1:8080/healthz | grep -Fxq healthy
# Consume the complete static HTML response before matching. With pipefail, using
# wget | grep -q can report SIGPIPE even when a valid marker was already found.
html="$(docker exec "$container" wget -q -O - http://127.0.0.1:8080/)" || {
    echo 'BLOCK: website homepage unavailable from container' >&2; exit 1;
}
grep -qi KAORI <<< "$html" || {
    echo 'BLOCK: website homepage identity missing' >&2; exit 1;
}
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
    grep -Fq "Website build $expected_version" <<< "$html" || {
        echo 'BLOCK: UAT footer build identity differs from accepted RC version' >&2; exit 1;
    }
    printf 'PASS: isolated UAT Website footer build version %s\n' "$expected_version"
fi
printf 'PASS: isolated website digest, health and non-root HTTP response verified\n'
printf 'Container: %s\nImage: %s\n' "$container" "$expected_image"
