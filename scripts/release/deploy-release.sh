#!/usr/bin/env bash
set -Eeuo pipefail
mode="${1:?expected preflight or deploy}"
[[ "$mode" == preflight || "$mode" == deploy ]] || { echo 'BLOCK: unsupported operation' >&2; exit 1; }
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'dispatch from staging only'
[[ "$(git rev-parse HEAD)" == "$ACCEPTED_SHA" ]] || fail 'staged source SHA mismatch'
[[ "$RC_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'invalid prerelease tag'
[[ "$APPROVAL_REF" =~ ^https://github.com/OXY7O/kaori-website/(issues|pull)/[0-9]+ ]] || fail 'explicit GitHub authorization reference is required'
[[ -n "${REGISTRY_HOST:-}" && "$REGISTRY_IMAGE" == "$REGISTRY_HOST/"* ]] || fail 'website registry variables missing or inconsistent'
[[ "$REGISTRY_IMAGE" == */kaori-website ]] || fail 'website image namespace is not dedicated; deployment blocked'
[[ -n "${REGISTRY_USER:-}" && -n "${REGISTRY_PASSWORD:-}" ]] || fail 'registry credentials missing'
[[ -n "${WEBSITE_HOST:-}" && -n "${WEBSITE_SSH_USER:-}" ]] || fail 'website deployment host/user missing'
[[ "$WEBSITE_HOST" =~ ^[a-zA-Z0-9._-]+$ && "$WEBSITE_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'invalid SSH host or username'
port="${WEBSITE_SSH_PORT:-22}"
[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( port >= 1 && port <= 65535 )) || fail 'invalid SSH port'
[[ "$WEBSITE_DEPLOY_ROOT" == /opt/kaori-website ]] || fail 'website release root must be /opt/kaori-website'
[[ -n "${WEBSITE_SSH_KEY:-}" && -n "${WEBSITE_KNOWN_HOSTS:-}" ]] || fail 'SSH private key/known_hosts missing'
command -v ssh-keygen >/dev/null && command -v ssh >/dev/null && command -v scp >/dev/null || fail 'SSH runner dependencies missing'
api="https://api.github.com/repos/$GITHUB_REPOSITORY"
headers=(-H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json')
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
[[ "$current" == "$ACCEPTED_SHA" ]] || fail 'staging changed since dispatch'
release="$(curl -fsS "${headers[@]}" "$api/releases/tags/$RC_TAG")"
[[ "$(jq -r '.prerelease' <<<"$release")" == true ]] || fail 'candidate is not an intentional prerelease'
[[ "$(jq -r '.target_commitish' <<<"$release")" == "$ACCEPTED_SHA" ]] || fail 'RC release targets different source SHA'
body="$(jq -r '.body // empty' <<<"$release")"
[[ "$body" == *"Staging source SHA: $ACCEPTED_SHA"* ]] || fail 'RC release evidence SHA missing'
digest="$(grep -oE 'Immutable digest: sha256:[a-f0-9]{64}' <<<"$body" | head -n1 | awk '{print $3}')"
[[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'RC release has no immutable digest'
image_ref="$REGISTRY_IMAGE@$digest"
[[ "$body" == *"Deployment authority: $image_ref"* ]] || fail 'RC registry identity does not match website configuration'
echo "Accepted RC $RC_TAG: source $ACCEPTED_SHA; digest $digest"
if [[ "$mode" == preflight ]]; then
  echo 'PASS: source, immutable prerelease evidence and required credential names are present'
  echo 'NOTE: approval_reference is a required manual audit pointer, not an automated reviewer/branch-protection gate'
  exit 0
fi
umask 077
key_file="$(mktemp)"
known_hosts="$(mktemp)"
askpass="$(mktemp)"
agent_started=false
cleanup() {
  if [[ "$agent_started" == true ]]; then ssh-agent -k >/dev/null 2>&1 || true; fi
  rm -f -- "$key_file" "$known_hosts" "$askpass"
}
trap cleanup EXIT INT TERM
printf '%s\n' "$WEBSITE_SSH_KEY" > "$key_file"
printf '%s\n' "$WEBSITE_KNOWN_HOSTS" > "$known_hosts"
chmod 600 "$key_file" "$known_hosts"
identity="$WEBSITE_HOST"
if [[ "$port" != 22 ]]; then identity="[$WEBSITE_HOST]:$port"; fi
ssh-keygen -F "$identity" -f "$known_hosts" >/dev/null || fail 'configured host key does not match SSH target'
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
ssh_opts=(-p "$port" -i "$key_file" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$known_hosts")
scp_opts=(-P "$port" -i "$key_file" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$known_hosts")
remote_release="$WEBSITE_DEPLOY_ROOT/releases/$ACCEPTED_SHA"
{
  printf 'set -Eeuo pipefail\n'
  printf 'deploy_root=%q\nremote_release=%q\n' "$WEBSITE_DEPLOY_ROOT" "$remote_release"
  cat <<'REMOTE_PREPARE'
[[ -d "$deploy_root" && ! -L "$deploy_root" && -w "$deploy_root" ]] || { echo 'BLOCK: website root not provisioned' >&2; exit 1; }
mkdir -p -- "$remote_release"
REMOTE_PREPARE
} | ssh "${ssh_opts[@]}" "$target" 'bash -se'
scp "${scp_opts[@]}" -r deploy/server "$target:$remote_release/"
{
  printf 'set -Eeuo pipefail\n'
  printf 'deploy_root=%q\nremote_release=%q\n' "$WEBSITE_DEPLOY_ROOT" "$remote_release"
  printf 'registry_host=%q\nregistry_user=%q\nregistry_pass=%q\n' "$REGISTRY_HOST" "$REGISTRY_USER" "$REGISTRY_PASSWORD"
  printf 'image_ref=%q\nsource_sha=%q\nrelease_tag=%q\n' "$image_ref" "$ACCEPTED_SHA" "$RC_TAG"
  printf 'attach_existing_edge=%q\n' "${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-0}"
  cat <<'REMOTE_DEPLOY'
docker_config="$(mktemp -d)"
chmod 700 "$docker_config"
cleanup_remote() { rm -rf -- "$docker_config"; }
trap cleanup_remote EXIT
export DOCKER_CONFIG="$docker_config"
printf '%s' "$registry_pass" | docker login "$registry_host" --username "$registry_user" --password-stdin >/dev/null
test -s "$remote_release/server/deploy.sh"
if [[ "$attach_existing_edge" == 1 ]]; then
  test -s "$remote_release/server/reattach-existing-site.sh"
  # Verify the operator's existing domain registration before replacing the live web container.
  bash "$remote_release/server/reattach-existing-site.sh" preflight
fi
# Website stays loopback-only unless the approved existing public edge is explicitly reattached.
export KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1
bash "$remote_release/server/deploy.sh" "$image_ref" "$source_sha" "$release_tag"
if [[ "$attach_existing_edge" == 1 ]]; then
  bash "$remote_release/server/reattach-existing-site.sh" attach
fi
docker logout "$registry_host" >/dev/null 2>&1 || true
REMOTE_DEPLOY
} | ssh "${ssh_opts[@]}" "$target" 'bash -se'
if [[ "${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-0}" == 1 ]]; then
  echo "PASS: accepted release $digest installed and published through the existing approved website edge; browser/human visual acceptance pending."
else
  echo "Release container deployed at accepted digest $digest; public edge and browser/human acceptance pending."
fi
