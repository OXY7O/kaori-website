#!/usr/bin/env bash
set -Eeuo pipefail

fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'diagnosis must run from staging'
[[ -n "${WEBSITE_HOST:-}" && -n "${WEBSITE_SSH_USER:-}" ]] || fail 'missing UAT SSH host/user'
[[ -n "${WEBSITE_SSH_KEY:-}" && -n "${WEBSITE_KNOWN_HOSTS:-}" ]] || fail 'missing pinned SSH identity'
[[ "$WEBSITE_HOST" =~ ^[A-Za-z0-9._-]+$ && "$WEBSITE_SSH_USER" =~ ^[A-Za-z0-9._-]+$ ]] || fail 'invalid SSH target'
port="${WEBSITE_SSH_PORT:-22}"
[[ "$port" =~ ^[0-9]{1,5}$ ]] && ((port >= 1 && port <= 65535)) || fail 'SSH port invalid'
umask 077
key_file="$(mktemp)"
host_file="$(mktemp)"
askpass="$(mktemp)"
agent_started=false
cleanup() {
  if [[ "$agent_started" == true ]]; then ssh-agent -k >/dev/null 2>&1 || true; fi
  rm -f -- "$key_file" "$host_file" "$askpass"
}
trap cleanup EXIT INT TERM
printf '%s\n' "$WEBSITE_SSH_KEY" > "$key_file"
printf '%s\n' "$WEBSITE_KNOWN_HOSTS" > "$host_file"
chmod 600 "$key_file" "$host_file"
identity="$WEBSITE_HOST"
if [[ "$port" != 22 ]]; then identity="[$WEBSITE_HOST]:$port"; fi
ssh-keygen -F "$identity" -f "$host_file" >/dev/null || fail 'SSH host fingerprint not pinned for target'
cat > "$askpass" <<'ASKPASS'
#!/usr/bin/env bash
printf '%s\n' "$WEBSITE_SSH_PASSPHRASE"
ASKPASS
chmod 700 "$askpass"
eval "$(ssh-agent -s)" >/dev/null
agent_started=true
export SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=:0
setsid -w ssh-add "$key_file" </dev/null >/dev/null
ssh -p "$port" -i "$key_file" -o BatchMode=yes -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$host_file" \
  "$WEBSITE_SSH_USER@$WEBSITE_HOST" 'bash -se' <<'REMOTE_DIAG'
set -Eeuo pipefail
name=kaori-website-web-1
printf 'Inspecting dedicated website container and localhost publication (read-only).\n'
command -v docker >/dev/null || { echo 'FAIL: docker absent'; exit 1; }
docker inspect "$name" >/dev/null || { echo 'FAIL: website container absent'; exit 1; }
printf '\nContainer state / internal health:\n'
docker inspect --format 'state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$name"
printf '\nContainer host port bindings:\n'
docker inspect --format '{{json .HostConfig.PortBindings}}' "$name"
printf '\nDocker port mapping:\n'
docker port "$name" 8080/tcp || true
printf '\nNetwork isolation:\n'
docker network inspect kaori-website_website-internal --format 'internal={{.Internal}} driver={{.Driver}}' || true
printf '\nHost listening sockets at 18080:\n'
if command -v ss >/dev/null; then ss -lnt '( sport = :18080 )'; else echo 'ss unavailable'; fi
printf '\nContainer-local HTTP health:\n'
docker exec "$name" wget -q -O - http://127.0.0.1:8080/healthz || echo 'FAIL: container-local HTTP health unavailable'
printf '\nHost localhost HTTP health:\n'
if command -v curl >/dev/null; then
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:18080/healthz; then
    printf '\nPASS: host-loopback UAT health reachable\n'
  else
    printf '\nFAIL: host-loopback UAT health unreachable\n'
    exit 2
  fi
else
  if wget -q -O - -T 5 http://127.0.0.1:18080/healthz; then
    printf '\nPASS: host-loopback UAT health reachable\n'
  else
    printf '\nFAIL: host-loopback UAT health unreachable\n'
    exit 2
  fi
fi
REMOTE_DIAG
