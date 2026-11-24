#!/usr/bin/env bash
set -Eeuo pipefail

fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || fail 'usage: deploy.sh IMAGE@sha256:<digest> SOURCE_SHA RELEASE_VERSION'
image="$1"; source_sha="$2"; release_version="$3"
[[ "$image" =~ ^[^[:space:]]+@sha256:[a-f0-9]{64}$ ]] || fail 'image must use exact OCI digest'
[[ "$source_sha" =~ ^[a-f0-9]{40}$ ]] || fail 'source SHA must be a 40-character lowercase Git SHA'
[[ "$release_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$ ]] || fail 'release version must be governed SemVer'
command -v docker >/dev/null || fail 'Docker is not available'
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose_file="${KAORI_WEBSITE_COMPOSE_FILE:-$script_dir/compose.website.yml}"
state_dir="${KAORI_WEBSITE_STATE_DIR:-/var/lib/kaori-website/deploy-state}"
runtime_env="${KAORI_WEBSITE_RUNTIME_ENV:-production}"
case "$runtime_env" in
    production)
        # GitHub Environment configuration selects the Website runtime; a
        # physical host may safely contain several independently named projects.
        project="${COMPOSE_PROJECT_NAME:-kaori-website}"
        [[ "$project" =~ ^kaori-website(-[a-z0-9][a-z0-9-]*)?$ &&
           "$project" != kaori-website-uat ]] ||
            fail 'production project must be a distinct Website namespace'
        [[ "$state_dir" == "/var/lib/$project/deploy-state" ]] ||
            fail 'production state must belong to the configured Website project'
        port="${KAORI_WEBSITE_LOOPBACK_PORT:-18080}"
        [[ "$port" =~ ^[0-9]{4,5}$ ]] && (( 10#$port >= 1024 && 10#$port <= 65535 )) ||
            fail 'production loopback port must be between 1024 and 65535'
        ;;
    uat)
        [[ "${COMPOSE_PROJECT_NAME:-}" == kaori-website-uat ]] ||
            fail 'UAT must use independent kaori-website-uat project'
        [[ "$state_dir" == /opt/kaori-website/uat/deploy-state ]] ||
            fail 'UAT must use separate /opt/kaori-website/uat/deploy-state'
        [[ "${KAORI_WEBSITE_RELEASE_LOCAL_ONLY:-}" == 1 ]] ||
            fail 'UAT must be loopback-only'
        [[ "$compose_file" == "$script_dir/compose.website.yml" ]] ||
            fail 'UAT base Compose authority changed'
        ;;
    *) fail 'unrecognized Website runtime environment' ;;
esac
[[ -f "$compose_file" && ! -L "$compose_file" ]] || fail 'compose file missing or symlinked'
[[ -d "$state_dir" && ! -L "$state_dir" && -w "$state_dir" ]] || fail 'website release state directory must be prepared and writable by deployment identity'
# Stable status is an independently committed host receipt, not part of the OCI image.
# A new candidate may have no release.json; the Website must show the RC fallback.
metadata_dir="$state_dir/release-metadata"
[[ ! -L "$metadata_dir" ]] || fail 'Website release-metadata directory must not be a symlink'
if [[ ! -d "$metadata_dir" ]]; then
    mkdir -m 0755 -- "$metadata_dir" || fail 'release metadata directory cannot be prepared'
fi
[[ -d "$metadata_dir" && ! -L "$metadata_dir" ]] || fail 'Website metadata path is not a directory'
export KAORI_WEBSITE_RELEASE_METADATA_DIR="$metadata_dir"
# Public analytics configuration is independent of private release receipts.
# An empty directory is intentional: no tracking until operator activation.
analytics_dir="$state_dir/analytics-public"
[[ ! -L "$analytics_dir" ]] || fail 'analytics-public directory must not be a symlink'
if [[ ! -d "$analytics_dir" ]]; then
    mkdir -m 0755 -- "$analytics_dir" || fail 'analytics-public directory cannot be prepared'
fi
[[ -d "$analytics_dir" && ! -L "$analytics_dir" ]] || fail 'analytics-public path is not a directory'
export KAORI_WEBSITE_ANALYTICS_DIR="$analytics_dir"
docker info >/dev/null || fail 'Docker daemon unavailable'
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
umask 077

# Image pull, metadata validation, and container reconciliation occur without touching KAORI app.
docker pull "$image"
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")"
[[ "$revision" == "$source_sha" ]] || fail "OCI revision $revision differs from admitted source $source_sha"
configured_version="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$image")"
[[ "$configured_version" == "${release_version#v}" ]] || fail 'OCI version differs from admitted release identity'
export KAORI_WEBSITE_IMAGE="$image"
docker compose "${compose_args[@]}" config --quiet || fail 'Compose validation failed'

candidate="$(mktemp "$state_dir/.release-candidate.XXXXXXXX")"
active_candidate=''
cleanup() { rm -f -- "$candidate" "${active_candidate:-$candidate}"; }
trap cleanup EXIT
printf 'KAORI_WEBSITE_IMAGE=%s\nKAORI_WEBSITE_SOURCE_SHA=%s\nKAORI_WEBSITE_VERSION=%s\n' "$image" "$source_sha" "$release_version" > "$candidate"

# Keep the prior immutable identity separate; failed candidate must not advance state.
previous_image=''
previous_version=''
if [[ -f "$state_dir/release.env" ]]; then
    # The committed receipt is the authority for BOTH the prior digest and
    # its embedded build identity. Never check a recovered image against
    # the rejected candidate's version.
    # shellcheck source=/dev/null
    source "$state_dir/release.env"
    [[ "${KAORI_WEBSITE_IMAGE:-}" =~ @sha256:[a-f0-9]{64}$ ]] ||
        fail 'previous release receipt contains an invalid image digest'
    [[ "${KAORI_WEBSITE_SOURCE_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
        fail 'previous release receipt contains an invalid source SHA'
    [[ "${KAORI_WEBSITE_VERSION:-}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[1-9][0-9]*)?$ ]] ||
        fail 'previous release receipt contains an invalid build version'
    previous_image="$KAORI_WEBSITE_IMAGE"
    previous_version="$KAORI_WEBSITE_VERSION"
fi
export KAORI_WEBSITE_IMAGE="$image"
export KAORI_WEBSITE_EXPECTED_VERSION="$release_version"

if ! docker compose "${compose_args[@]}" up -d --pull never --no-build web || ! bash "$script_dir/verify.sh"; then
    echo 'FAIL: candidate unhealthy; current release receipt is NOT changed' >&2
    if [[ -n "$previous_image" && "$previous_image" != "$image" ]]; then
        echo 'Attempting recovery of last committed website digest' >&2
        export KAORI_WEBSITE_IMAGE="$previous_image"
        export KAORI_WEBSITE_EXPECTED_VERSION="$previous_version"
        if docker compose "${compose_args[@]}" up -d --no-build web && bash "$script_dir/verify.sh"; then
            echo 'RECOVERED: previous website digest is healthy; release receipt unchanged' >&2
        else
            echo 'CRITICAL: previous website recovery failed; manual intervention required' >&2
        fi
    fi
    fail 'candidate deployment rejected'
fi

# Commit the selected active OCI identity independently of any prior stable
# release. A future candidate or rollback therefore invalidates a stale stable
# release.json whenever its immutable digest/source/build differs.
[[ ! -L "$metadata_dir/active.json" ]] ||
    fail 'active release metadata must not be a symlink'
active_candidate="$(mktemp "$metadata_dir/.active.json.XXXXXXXX")" ||
    fail 'active metadata cannot be staged'
printf '{"schema":1,"status":"active","build_tag":"%s","source_sha":"%s","image_digest":"%s"}\n' \
    "$release_version" "$source_sha" "${image##*@}" > "$active_candidate"
chmod 0644 "$active_candidate"
if [[ -f "$state_dir/release.env" ]]; then
    cp -- "$state_dir/release.env" "$state_dir/previous-release.env"
fi
mv -- "$candidate" "$state_dir/release.env"
mv -- "$active_candidate" "$metadata_dir/active.json"
trap - EXIT
printf 'PASS: website release committed: %s / %s\n' "$release_version" "$source_sha"
printf 'External shared-edge publication is a separate operation.\n'
