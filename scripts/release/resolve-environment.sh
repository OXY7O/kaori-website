#!/usr/bin/env bash
# Resolve GitHub Environment runner variables into existing release adapter names.
set -Eeuo pipefail
set +x

fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
mode="${1:-}"
case "$mode" in registry|deployment|preflight) ;; *) fail 'invalid configuration mode' ;; esac
[[ -n "${GITHUB_ENV:-}" && -w "$GITHUB_ENV" ]] || fail 'runner GITHUB_ENV file required'

put() {
  local name="$1" value="$2"
  [[ -n "$value" && "$value" != *$'\n'* && "$value" != *$'\r'* ]] ||
    fail "missing or invalid protected Environment variable: $name"
  printf '%s=%s\n' "$name" "$value" >> "$GITHUB_ENV"
}
host="${KAORI_WEBSITE_DOCKER_REGISTRY_HOST:-}"
image="${KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE:-}"
[[ -n "$host" && "$host" =~ ^[a-zA-Z0-9.-]+(:[0-9]{1,5})?$ ]] || fail 'registry host invalid'
[[ "$image" == "$host/"* && "$image" == */kaori-website && "$image" != *' '* && "$image" != *':'* ]] ||
  fail 'registry image namespace invalid'
put REGISTRY_HOST "$host"
put REGISTRY_IMAGE "$image"

if [[ "$mode" == registry ]]; then
  echo 'PASS: protected Environment registry identity'
  exit 0
fi

deploy_host="${KAORI_WEBSITE_HOST:-}"
deploy_port="${KAORI_WEBSITE_HOST_PORT:-}"
deploy_user="${KAORI_WEBSITE_HOST_USER:-}"
deploy_root="${KAORI_WEBSITE_HOST_DEPLOY_ROOT:-}"
[[ "$deploy_host" =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'deployment SSH host invalid'
[[ "$deploy_user" =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'deployment SSH user invalid'
[[ "$deploy_port" =~ ^[0-9]{1,5}$ ]] || fail 'deployment SSH port invalid'
(( 10#$deploy_port > 0 && 10#$deploy_port <= 65535 )) || fail 'SSH port out of range'
[[ "$deploy_root" == /* && "$deploy_root" != *'..'* ]] || fail 'deployment root unsafe'

if [[ "$mode" == preflight ]]; then
  put DEPLOY_HOST "$deploy_host"
  put DEPLOY_PORT "$deploy_port"
  put DEPLOY_USER "$deploy_user"
  put DEPLOY_ROOT "$deploy_root"
else
  put WEBSITE_HOST "$deploy_host"
  put WEBSITE_SSH_PORT "$deploy_port"
  put WEBSITE_SSH_USER "$deploy_user"
  put WEBSITE_DEPLOY_ROOT "$deploy_root"
  put WEBSITE_COMPOSE_PROJECT "${KAORI_WEBSITE_COMPOSE_PROJECT:-kaori-website}"
  put WEBSITE_STATE_DIR "${KAORI_WEBSITE_STATE_DIR:-/var/lib/kaori-website/deploy-state}"
  put WEBSITE_LOOPBACK_PORT "${KAORI_WEBSITE_LOOPBACK_PORT:-18080}"
  put KAORI_WEBSITE_ATTACH_EXISTING_EDGE "${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-1}"
fi
echo 'PASS: protected Environment target mapped (values withheld)'
