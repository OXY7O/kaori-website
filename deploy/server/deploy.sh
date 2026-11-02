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
        [[ -z "${COMPOSE_PROJECT_NAME:-}" || "$COMPOSE_PROJECT_NAME" == kaori-website ]] ||
            fail 'production project identity must be kaori-website'
        [[ "$state_dir" == /var/lib/kaori-website/deploy-state ]] ||
            fail 'production release state authority changed'
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
cleanup() { rm -f -- "$candidate"; }
trap cleanup EXIT
printf 'KAORI_WEBSITE_IMAGE=%s\nKAORI_WEBSITE_SOURCE_SHA=%s\nKAORI_WEBSITE_VERSION=%s\n' "$image" "$source_sha" "$release_version" > "$candidate"

# Keep the prior immutable identity separate; failed candidate must not advance state.
previous_image=''
if [[ -f "$state_dir/release.env" ]]; then
    # The release receipt is private to the approved website deployment identity.
    # shellcheck source=/dev/null
    source "$state_dir/release.env"
    if [[ "${KAORI_WEBSITE_IMAGE:-}" =~ @sha256:[a-f0-9]{64}$ ]]; then
        previous_image="$KAORI_WEBSITE_IMAGE"
    fi
fi
export KAORI_WEBSITE_IMAGE="$image"
export KAORI_WEBSITE_EXPECTED_VERSION="$release_version"

if ! docker compose "${compose_args[@]}" up -d --pull never --no-build web || ! bash "$script_dir/verify.sh"; then
    echo 'FAIL: candidate unhealthy; current release receipt is NOT changed' >&2
    if [[ -n "$previous_image" && "$previous_image" != "$image" ]]; then
        echo 'Attempting recovery of last committed website digest' >&2
        export KAORI_WEBSITE_IMAGE="$previous_image"
        if docker compose "${compose_args[@]}" up -d --no-build web && bash "$script_dir/verify.sh"; then
            echo 'RECOVERED: previous website digest is healthy; release receipt unchanged' >&2
        else
            echo 'CRITICAL: previous website recovery failed; manual intervention required' >&2
        fi
    fi
    fail 'candidate deployment rejected'
fi

if [[ -f "$state_dir/release.env" ]]; then
    cp -- "$state_dir/release.env" "$state_dir/previous-release.env"
fi
mv -- "$candidate" "$state_dir/release.env"
trap - EXIT
printf 'PASS: website release committed: %s / %s\n' "$release_version" "$source_sha"
printf 'External shared-edge publication is a separate operation.\n'
