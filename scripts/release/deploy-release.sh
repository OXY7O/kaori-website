#!/usr/bin/env bash
set -Eeuo pipefail
mode="${1:?expected preflight or deploy}"
[[ "$mode" == preflight || "$mode" == deploy ]] || { echo 'BLOCK: unsupported operation' >&2; exit 1; }
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
if [[ "$GITHUB_EVENT_NAME" == push ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/uat-request ]] || fail 'push UAT request must use kaori/uat-request'
  [[ "${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-0}" == 0 ]] || fail 'request branch may deploy privately only'
elif [[ "$GITHUB_EVENT_NAME" == workflow_dispatch ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'manual UAT dispatch must use kaori/staging'
else
  fail 'unsupported UAT request event'
fi
[[ "$(git rev-parse HEAD)" == "$ACCEPTED_SHA" ]] || fail 'staged source SHA mismatch'
[[ "$RC_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'invalid prerelease tag'
[[ "$APPROVAL_REF" =~ ^https://github.com/OXY7O/kaori-website/(issues|pull)/[0-9]+ ]] || fail 'explicit GitHub authorization reference is required'
[[ "${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-0}" =~ ^[01]$ ]] || fail 'public edge deployment option must be 0 or 1'
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
release_file="$(mktemp)"
http_status="$(curl -sS -o "$release_file" -w '%{http_code}' "${headers[@]}" "$api/releases/tags/$RC_TAG")"
if [[ "$http_status" == 404 ]]; then
  rm -f "$release_file"
  fail "RC $RC_TAG is not published; run Release Candidate before requesting UAT deployment"
fi
[[ "$http_status" == 200 ]] || { rm -f "$release_file"; fail "RC authority lookup failed (HTTP $http_status)"; }
release="$(cat "$release_file")"
rm -f "$release_file"
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
if [[ "$GITHUB_EVENT_NAME" == push ]]; then
  runtime_env=uat
  remote_release="$WEBSITE_DEPLOY_ROOT/uat/releases/$ACCEPTED_SHA"
  remote_state_dir="$WEBSITE_DEPLOY_ROOT/uat/deploy-state"
else
  runtime_env=production
  remote_release="$WEBSITE_DEPLOY_ROOT/releases/$ACCEPTED_SHA"
  remote_state_dir=/var/lib/kaori-website/deploy-state
fi
{
  printf 'set -Eeuo pipefail\n'
  printf 'deploy_root=%q\nremote_release=%q\nremote_state_dir=%q\nruntime_env=%q\n' "$WEBSITE_DEPLOY_ROOT" "$remote_release" "$remote_state_dir" "$runtime_env"
  cat <<'REMOTE_PREPARE'
[[ -d "$deploy_root" && ! -L "$deploy_root" && -w "$deploy_root" ]] || { echo 'BLOCK: website root not provisioned' >&2; exit 1; }
if [[ "$runtime_env" == uat ]]; then
  [[ "$remote_release" == "$deploy_root"/uat/releases/* && "$remote_state_dir" == "$deploy_root/uat/deploy-state" ]] ||
    { echo 'BLOCK: UAT root paths deviate from approved Website namespace' >&2; exit 1; }
  [[ ! -L "$deploy_root/uat" && ! -L "$deploy_root/uat/releases" && ! -L "$deploy_root/uat/deploy-state" ]] ||
    { echo 'BLOCK: UAT path cannot be symlinked' >&2; exit 1; }
  available_mem="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  [[ "$available_mem" =~ ^[0-9]+$ ]] && (( available_mem >= 262144 )) ||
    { echo 'BLOCK: insufficient available memory for separate UAT (256 MiB minimum)' >&2; exit 1; }
  disk_free="$(df -Pk "$deploy_root" | awk 'NR==2 {print $4}')"
  [[ "$disk_free" =~ ^[0-9]+$ ]] && (( disk_free >= 524288 )) ||
    { echo 'BLOCK: insufficient free Website disk for UAT (512 MiB minimum)' >&2; exit 1; }
  # Distinct project/port is still verified after creation by the existing runtime adapter.
  # Reject an occupied loopback listener belonging to something other than the UAT project.
  if command -v ss >/dev/null && ss -H -ltn '( sport = :18083 )' | grep -q .; then
    existing_uat="$(docker ps --filter label=com.docker.compose.project=kaori-website-uat --filter label=com.docker.compose.service=web --format '{{.ID}}')"
    [[ -n "$existing_uat" ]] || { echo 'BLOCK: UAT loopback port 18083 already occupied' >&2; exit 1; }
  fi
  mkdir -p -- "$deploy_root/uat/releases" "$remote_state_dir"
  [[ -w "$remote_state_dir" ]] || { echo 'BLOCK: UAT receipt directory is not writable' >&2; exit 1; }
fi
mkdir -p -- "$remote_release"
REMOTE_PREPARE
} | ssh "${ssh_opts[@]}" "$target" 'bash -se'
scp "${scp_opts[@]}" -r deploy/server "$target:$remote_release/"
{
  printf 'set -Eeuo pipefail\n'
  printf 'deploy_root=%q\nremote_release=%q\nremote_state_dir=%q\nruntime_env=%q\n' "$WEBSITE_DEPLOY_ROOT" "$remote_release" "$remote_state_dir" "$runtime_env"
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
else
  if [[ "$runtime_env" == uat ]]; then
    [[ "$attach_existing_edge" == 0 ]] || { echo 'BLOCK: UAT may not attach public edge' >&2; exit 1; }
    existing_uat="$(docker ps --filter label=com.docker.compose.project=kaori-website-uat \
      --filter label=com.docker.compose.service=web --format '{{.ID}}')"
    if [[ -n "$existing_uat" ]]; then
      while IFS= read -r existing_id; do
        [[ -n "$existing_id" ]] || continue
        published="$(docker inspect --format '{{if index .NetworkSettings.Networks "edge-public"}}true{{else}}false{{end}}' "$existing_id")"
        [[ "$published" != true ]] || { echo 'BLOCK: UAT container is attached to edge-public' >&2; exit 1; }
      done <<< "$existing_uat"
    fi
    export COMPOSE_PROJECT_NAME=kaori-website-uat
    export KAORI_WEBSITE_RUNTIME_ENV=uat
    export KAORI_WEBSITE_STATE_DIR="$remote_state_dir"
    # Capture production Website identity before isolated UAT mutation.
    existing_public="$(docker ps --filter label=com.docker.compose.project=kaori-website \
      --filter label=com.docker.compose.service=web --format '{{.ID}}')"
    [[ "$existing_public" =~ ^[a-f0-9]{12,64}$ ]] || {
      echo 'BLOCK: expected exactly one running public Website container before isolated UAT' >&2
      exit 1
    }
    public_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$existing_public")"
    [[ "$public_health" == healthy ]] || {
      echo 'BLOCK: existing public Website must be healthy before isolated UAT' >&2
      exit 1
    }
  else
    # A manual private release must never silently replace the already public Website.
    existing_web="$(docker ps --filter label=com.docker.compose.project=kaori-website \
      --filter label=com.docker.compose.service=web --format '{{.ID}}')"
    if [[ -n "$existing_web" ]]; then
      while IFS= read -r existing_id; do
        [[ -n "$existing_id" ]] || continue
        published="$(docker inspect --format '{{if index .NetworkSettings.Networks "edge-public"}}true{{else}}false{{end}}' "$existing_id")"
        [[ "$published" != true ]] || {
          echo 'BLOCK: current website is publicly attached; explicit public-edge approval required' >&2
          exit 1
        }
      done <<< "$existing_web"
    fi
  fi
fi
# UAT and production use separate Compose project, release state and private port.
export KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1
bash "$remote_release/server/deploy.sh" "$image_ref" "$source_sha" "$release_tag"
if [[ "$runtime_env" == uat ]]; then
  current_public="$(docker ps --filter label=com.docker.compose.project=kaori-website \
    --filter label=com.docker.compose.service=web --format '{{.ID}}')"
  [[ "$current_public" == "$existing_public" ]] || {
    echo 'CRITICAL: stable public Website container changed during isolated UAT' >&2
    exit 1
  }
  public_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$existing_public")"
  [[ "$public_health" == healthy ]] || {
    echo 'CRITICAL: public Website lost health during private UAT deployment' >&2
    exit 1
  }
  echo 'PASS: public Website container unchanged and healthy; private UAT uses independent Compose project'
fi
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
