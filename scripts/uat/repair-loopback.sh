#!/usr/bin/env bash
set -Eeuo pipefail
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'UAT repair must run from staging'
[[ "$(git rev-parse HEAD)" == "$ACCEPTED_SHA" ]] || fail 'exact repair source mismatch'
[[ "$REGISTRY_IMAGE" == "$REGISTRY_HOST/"* && "$REGISTRY_IMAGE" == */kaori-website ]] || fail 'website namespace mismatch'
[[ "$RELEASE_SOURCE_SHA" =~ ^[a-f0-9]{40}$ && "$ACCEPTED_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'invalid source evidence'
[[ "$WEBSITE_HOST" =~ ^[A-Za-z0-9._-]+$ && "$WEBSITE_SSH_USER" =~ ^[A-Za-z0-9._-]+$ ]] || fail 'invalid SSH target'
[[ -n "${WEBSITE_SSH_KEY:-}" && -n "${WEBSITE_KNOWN_HOSTS:-}" ]] || fail 'pinned SSH credentials missing'
port="${WEBSITE_SSH_PORT:-22}"
[[ "$port" =~ ^[0-9]{1,5}$ ]] && ((port >= 1 && port <= 65535)) || fail 'invalid SSH port'

api="https://api.github.com/repos/$GITHUB_REPOSITORY"
headers=(-H "Authorization: Bearer ${GH_TOKEN:?}" -H 'Accept: application/vnd.github+json')
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r .object.sha)"
[[ "$current" == "$ACCEPTED_SHA" ]] || fail 'staging moved before mutation'
release="$(curl -fsS "${headers[@]}" "$api/releases/tags/$RELEASE_TAG")"
[[ "$(jq -r .prerelease <<< "$release")" == true ]] || fail 'approved RC is not a prerelease'
[[ "$(jq -r .target_commitish <<< "$release")" == "$RELEASE_SOURCE_SHA" ]] || fail 'RC SHA differs'
body="$(jq -r '.body // empty' <<< "$release")"
[[ "$body" == *"Staging source SHA: $RELEASE_SOURCE_SHA"* ]] || fail 'RC source evidence missing'
digest="$(grep -oE 'Immutable digest: sha256:[0-9a-f]{64}' <<< "$body" | head -n1 | awk '{print $3}')"
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'RC digest missing'
image="$REGISTRY_IMAGE@$digest"
[[ "$body" == *"Deployment authority: $image"* ]] || fail 'unexpected release image authority'

umask 077
key_file="$(mktemp)"; hosts_file="$(mktemp)"; askpass="$(mktemp)"
agent_started=false
cleanup() {
  if [[ "$agent_started" == true ]]; then ssh-agent -k >/dev/null 2>&1 || true; fi
  rm -f -- "$key_file" "$hosts_file" "$askpass"
}
trap cleanup EXIT INT TERM
printf '%s\n' "$WEBSITE_SSH_KEY" > "$key_file"
printf '%s\n' "$WEBSITE_KNOWN_HOSTS" > "$hosts_file"
chmod 600 "$key_file" "$hosts_file"
identity="$WEBSITE_HOST"
if [[ "$port" != 22 ]]; then identity="[$WEBSITE_HOST]:$port"; fi
ssh-keygen -F "$identity" -f "$hosts_file" >/dev/null || fail 'host not in pinned known_hosts'
cat > "$askpass" <<'ASKPASS'
#!/usr/bin/env bash
printf '%s\n' "$WEBSITE_SSH_PASSPHRASE"
ASKPASS
chmod 700 "$askpass"
eval "$(ssh-agent -s)" >/dev/null
agent_started=true
export SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=:0
setsid -w ssh-add "$key_file" </dev/null >/dev/null
target="$WEBSITE_SSH_USER@$WEBSITE_HOST"
ssh_opts=(-p "$port" -i "$key_file" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$hosts_file")
scp_opts=(-P "$port" -i "$key_file" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$hosts_file")
adapter="/opt/kaori-website/uat-repairs/$ACCEPTED_SHA"
{
  printf 'set -Eeuo pipefail\nadapter=%q\n' "$adapter"
  cat <<'REMOTE_PREPARE'
test -d /opt/kaori-website && test -w /opt/kaori-website && test ! -L /opt/kaori-website
mkdir -p -- "$adapter"
REMOTE_PREPARE
} | ssh "${ssh_opts[@]}" "$target" 'bash -se'
scp "${scp_opts[@]}" -r deploy/server "$target:$adapter/"
{
  printf 'set -Eeuo pipefail\nadapter=%q\nimage=%q\noriginal_sha=%q\nversion=%q\n' "$adapter" "$image" "$RELEASE_SOURCE_SHA" "$RELEASE_TAG"
  cat <<'REMOTE_REPAIR'
state=/var/lib/kaori-website/deploy-state/release.env
[[ -f "$state" && ! -L "$state" ]] || { echo 'BLOCK: committed website state missing' >&2; exit 1; }
grep -Fxq "KAORI_WEBSITE_IMAGE=$image" "$state" || { echo 'BLOCK: current image differs from accepted digest' >&2; exit 1; }
grep -Fxq "KAORI_WEBSITE_SOURCE_SHA=$original_sha" "$state" || { echo 'BLOCK: current source differs from accepted RC' >&2; exit 1; }
grep -Fxq "KAORI_WEBSITE_VERSION=$version" "$state" || { echo 'BLOCK: current version differs from accepted RC' >&2; exit 1; }
container=kaori-website-web-1
[[ "$(docker inspect --format '{{.Config.Image}}' "$container")" == "$image" ]] || { echo 'BLOCK: active container image mismatch' >&2; exit 1; }
test -f "$adapter/server/compose.website.yml" && test -f "$adapter/server/compose.uat.yml"
export KAORI_WEBSITE_IMAGE="$image"
export KAORI_WEBSITE_UAT_LOCAL_ONLY=1
compose=(-f "$adapter/server/compose.website.yml" -f "$adapter/server/compose.uat.yml")
docker compose "${compose[@]}" config --quiet
# Reconcile only the website container from its already accepted OCI digest.
if ! docker compose "${compose[@]}" up -d --pull never --no-build web ||
   ! bash "$adapter/server/verify.sh"; then
    echo 'FAIL: UAT ingress remediation; attempting restore of previous website-only Compose network' >&2
    previous="/opt/kaori-website/releases/$original_sha/server"
    if [[ -f "$previous/compose.website.yml" && -f "$previous/compose.uat.yml" ]]; then
        docker compose -f "$previous/compose.website.yml" -f "$previous/compose.uat.yml" up -d --pull never --no-build web || echo 'CRITICAL: previous UAT network restore failed' >&2
    fi
    exit 1
fi
printf 'PASS: private UAT host HTTP is reachable on 127.0.0.1:18080; exact image receipt unchanged\n'
REMOTE_REPAIR
} | ssh "${ssh_opts[@]}" "$target" 'bash -se'
printf 'PASS: issue #15 one-time UAT network remediation completed without rebuilding image\n'
