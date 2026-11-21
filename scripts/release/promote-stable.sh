#!/usr/bin/env bash
set -Eeuo pipefail
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 ]] || fail 'usage: promote-stable.sh preflight|publish'
mode="$1"
[[ "$mode" == preflight || "$mode" == publish ]] || fail 'unsupported stable mode'
for name in GH_TOKEN GITHUB_SHA GITHUB_REF GITHUB_REPOSITORY GITHUB_EVENT_NAME GITHUB_WORKFLOW_REF GITHUB_RUN_ID REGISTRY_HOST REGISTRY_IMAGE PRODUCTION_STABLE_TAG PRODUCTION_PROMOTION_PR; do
  [[ -n "$(printenv "$name" || true)" ]] || fail "missing $name"
done
[[ "$GITHUB_REPOSITORY" == OXY7O/kaori-website &&
   "$GITHUB_EVENT_NAME" == workflow_dispatch && "$GITHUB_REF" == refs/heads/main ]] ||
  fail 'only explicit main release dispatch can publish stable'
[[ "$GITHUB_WORKFLOW_REF" == OXY7O/kaori-website/.github/workflows/release-production.yml@refs/heads/main ]] ||
  fail 'canonical protected production release workflow identity required'
[[ "$PRODUCTION_STABLE_TAG" =~ ^v[0-9]+[.][0-9]+[.][0-9]+$ &&
   "$PRODUCTION_PROMOTION_PR" =~ ^[1-9][0-9]*$ ]] ||
  fail 'explicit stable version and promotion PR are required'
[[ "$REGISTRY_IMAGE" == "$REGISTRY_HOST/"* && "$REGISTRY_IMAGE" == */kaori-website ]] ||
  fail 'dedicated Website image authority missing'
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ && "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]] ||
  fail 'main checkout identity mismatch'
api="https://api.github.com/repos/$GITHUB_REPOSITORY"
api_get() {
  curl --fail-with-body -sS -H "Authorization: Bearer $GH_TOKEN" \
    -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "$1"
}
api_status() {
  curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GH_TOKEN" \
    -H 'Accept: application/vnd.github+json' "$1"
}
[[ "$(api_get "$api/git/ref/heads/main" | jq -r '.object.sha')" == "$GITHUB_SHA" ]] ||
  fail 'main advanced during production approval'

# The explicit request selects an independently reviewed staging promotion.
# It may be an ancestor of current main if later changes are documentation-only;
# any drift of Website build inputs is rejected below.
pull="$(api_get "$api/pulls/$PRODUCTION_PROMOTION_PR")" || fail 'requested promotion PR absent'
prs="$(jq -c '[.] | map(select(
  .merged_at != null and .base.ref == "main" and
  .head.ref == "kaori/staging" and .head.repo.full_name == "OXY7O/kaori-website"
))' <<<"$pull")"
[[ "$(jq length <<<"$prs")" -eq 1 ]] || fail 'expected exactly one reviewed staging-to-main PR'
pr="$(jq -r '.[0].number' <<<"$prs")"
[[ "$pr" == "$PRODUCTION_PROMOTION_PR" ]] || fail 'requested PR identity mismatch'
promotion_sha="$(jq -r '.[0].head.sha' <<<"$prs")"
merge_sha="$(jq -r '.[0].merge_commit_sha' <<<"$prs")"
author="$(jq -r '.[0].user.login' <<<"$prs")"
merged_at="$(jq -r '.[0].merged_at' <<<"$prs")"
pr_body="$(jq -r '.[0].body // ""' <<<"$prs")"
[[ "$merge_sha" =~ ^[a-f0-9]{40}$ ]] || fail 'reviewed promotion merge SHA invalid'
git merge-base --is-ancestor "$merge_sha" HEAD ||
  fail 'requested staging promotion is not on current main lineage'
[[ "$promotion_sha" =~ ^[a-f0-9]{40}$ ]] || fail 'promotion staging source invalid'
git merge-base --is-ancestor "$promotion_sha" HEAD || fail 'reviewed promotion head is not a main ancestor'
reviews="$(api_get "$api/pulls/$pr/reviews")" || fail 'promotion reviews unavailable'
jq -e --arg author "$author" --arg sha "$promotion_sha" '
  [.[] | select(.user.login != $author and .commit_id == $sha) | .user.login] as $reviewers
  | [.[] | select(.user.login as $login | $reviewers | index($login) != null)] as $relevant
  | any($reviewers[]; . as $login |
      ([$relevant[] | select(.user.login == $login)] | last | .state) == "APPROVED")
' <<<"$reviews" >/dev/null ||
  fail 'current-head independent promotion reviewer approval missing'

# The selected, independently reviewed promotion PR records accepted Human UAT once.
evidence="$(grep -E '^Human UAT evidence: https://github[.]com/OXY7O/kaori-website/issues/[1-9][0-9]*#issuecomment-[1-9][0-9]*$' <<<"$pr_body" || true)"
[[ "$(printf '%s\n' "$evidence" | grep -c '^Human UAT evidence:' || true)" -eq 1 ]] ||
  fail 'promotion PR requires one linked Human UAT approval comment'
evidence_url="$(cut -d' ' -f4 <<<"$evidence")"
issue="$(sed -E 's@.*/issues/([0-9]+)#issuecomment-.*@\1@' <<<"$evidence_url")"
comment_id="$(sed -E 's@.*#issuecomment-([0-9]+)$@\1@' <<<"$evidence_url")"
comment="$(api_get "$api/issues/comments/$comment_id")" || fail 'Human UAT comment absent'
[[ "$(jq -r '.issue_url' <<<"$comment")" == "$api/issues/$issue" ]] ||
  fail 'UAT comment belongs to wrong issue'
[[ "$(jq -r '.created_at' <<<"$comment")" < "$merged_at" ]] ||
  fail 'Human UAT happened after promotion merge'
[[ "$(jq -r '.updated_at' <<<"$comment")" < "$merged_at" ]] ||
  fail 'Human UAT evidence was edited after promotion merge'
approver="$(jq -r '.user.login // ""' <<<"$comment")"
[[ "$approver" =~ ^[A-Za-z0-9-]+$ ]] || fail 'invalid UAT approver'
permission="$(api_get "$api/collaborators/$approver/permission" | jq -r '.permission')"
case "$permission" in admin|maintain|write) ;; *) fail 'UAT approver lacks write authority' ;; esac
marker="$(grep -E '^KAORI_WEBSITE_UAT_ACCEPTED:[a-f0-9]{40}:v[0-9]+[.][0-9]+[.][0-9]+-rc[.][1-9][0-9]*:sha256:[a-f0-9]{64}$' <<<"$(jq -r '.body // ""' <<<"$comment")" || true)"
[[ "$(printf '%s\n' "$marker" | grep -c '^KAORI_WEBSITE_UAT_ACCEPTED:' || true)" -eq 1 ]] ||
  fail 'missing uniquely bound signed RC Human UAT acceptance'
accepted_sha="$(cut -d: -f2 <<<"$marker")"
rc_tag="$(cut -d: -f3 <<<"$marker")"
digest="sha256:$(cut -d: -f5 <<<"$marker")"
[[ "$accepted_sha" =~ ^[a-f0-9]{40}$ ]] || fail 'invalid accepted RC source SHA'
# An accepted earlier RC may precede later docs/release-guard-only staging merges.
# Trust only the prior Human UAT binding and require it to be on the reviewed
# promotion lineage, with no change to any shipped Website build input.
git merge-base --is-ancestor "$accepted_sha" "$promotion_sha" ||
  fail 'Human UAT source is not an ancestor of reviewed promotion'
git merge-base --is-ancestor "$accepted_sha" HEAD ||
  fail 'Human UAT source is not an ancestor of approved main'
for path in Dockerfile .dockerignore package.json package-lock.json astro.config.mjs tsconfig.json src public deploy; do
  git diff --quiet "$accepted_sha" HEAD -- "$path" || fail "build inputs drifted since accepted RC: $path"
done
rc_sha="$accepted_sha"
stable_tag="$(sed -E 's/-rc[.][1-9][0-9]*$//' <<<"$rc_tag")"
[[ "$stable_tag" =~ ^v[0-9]+[.][0-9]+[.][0-9]+$ ]] || fail 'stable SemVer invalid'
[[ "$stable_tag" == "$PRODUCTION_STABLE_TAG" ]] ||
  fail 'requested stable tag differs from Human-Accepted signed RC version'

rc="$(api_get "$api/releases/tags/$rc_tag")" || fail 'accepted signed RC absent'
[[ "$(jq -r '.prerelease' <<<"$rc")" == true &&
   "$(jq -r '.draft' <<<"$rc")" == false &&
   "$(jq -r '.target_commitish' <<<"$rc")" == "$rc_sha" ]] ||
  fail 'signed RC release does not match accepted staging source'
[[ "$(api_get "$api/git/ref/tags/$rc_tag" | jq -r '.object.sha')" == "$rc_sha" ]] ||
  fail 'signed RC Git tag differs from accepted source'
rc_body="$(jq -r '.body // ""' <<<"$rc")"
image_ref="$REGISTRY_IMAGE@$digest"
[[ "$rc_body" == *"Staging source SHA: $rc_sha"* &&
   "$rc_body" == *"Immutable digest: $digest"* &&
   "$rc_body" == *"Deployment authority: $image_ref"* &&
   "$rc_body" == *'Trivy security and signed SBOM/provenance: PASS'* ]] ||
  fail 'accepted RC has incomplete signed digest/SBOM evidence'
existing="$(api_status "$api/releases/tags/$stable_tag")"
if [[ "$existing" == 200 ]]; then
  stable="$(api_get "$api/releases/tags/$stable_tag")"
  stable_body="$(jq -r '.body // ""' <<<"$stable")"
  [[ "$(jq -r '.target_commitish' <<<"$stable")" == "$GITHUB_SHA" &&
     "$(jq -r '.prerelease' <<<"$stable")" == false &&
     "$stable_body" == *"Immutable digest: $digest"* &&
     "$stable_body" == *"Human UAT evidence: $evidence_url"* ]] ||
    fail 'existing stable release has different acceptance or digest'
  [[ "$(api_get "$api/git/ref/tags/$stable_tag" | jq -r '.object.sha')" == "$GITHUB_SHA" ]] ||
    fail 'existing stable Git tag differs from approved main'
elif [[ "$existing" == 404 ]]; then
  [[ "$(api_status "$api/git/ref/tags/$stable_tag")" == 404 ]] ||
    fail 'stable Git tag was reserved without completed stable release'
else
  fail 'cannot establish stable tag uniqueness'
fi

echo "PASS: approved main=$GITHUB_SHA RC=$rc_tag source=$rc_sha stable=$stable_tag digest=$digest"
if [[ "$mode" == preflight ]]; then
  echo 'PASS: trusted UAT, independent promotion review and immutable main/RC identity; no mutation'
  exit 0
fi
for name in REGISTRY_USER REGISTRY_PASSWORD WEBSITE_HOST WEBSITE_SSH_USER WEBSITE_DEPLOY_ROOT WEBSITE_SSH_KEY WEBSITE_KNOWN_HOSTS; do
  [[ -n "$(printenv "$name" || true)" ]] || fail "missing production verification credential $name"
done
[[ "$WEBSITE_DEPLOY_ROOT" == /opt/kaori-website &&
   "$WEBSITE_HOST" =~ ^[a-zA-Z0-9._-]+$ &&
   "$WEBSITE_SSH_USER" =~ ^[a-zA-Z0-9._-]+$ ]] ||
  fail 'production runtime host or root is invalid'
# GitHub Environment production owns target configuration. Neither its name
# nor a shared IP determines whether a separate Docker runtime exists.
runtime_project="${WEBSITE_COMPOSE_PROJECT:-kaori-website}"
runtime_state="${WEBSITE_STATE_DIR:-/var/lib/kaori-website/deploy-state}"
runtime_port="${WEBSITE_LOOPBACK_PORT:-18080}"
runtime_edge="${KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-1}"
[[ "$runtime_project" =~ ^kaori-website(-[a-z0-9][a-z0-9-]*)?$ &&
   "$runtime_project" != kaori-website-uat ]] ||
  fail 'invalid configured production Website project'
[[ "$runtime_state" == "/var/lib/$runtime_project/deploy-state" ]] ||
  fail 'configured production release state does not belong to project'
[[ "$runtime_port" =~ ^[0-9]{4,5}$ ]] &&
  (( 10#$runtime_port >= 1024 && 10#$runtime_port <= 65535 )) ||
  fail 'invalid configured production loopback port'
[[ "$runtime_edge" == 0 || "$runtime_edge" == 1 ]] ||
  fail 'invalid configured production edge selection'
if [[ "$runtime_edge" == 1 ]]; then
  [[ "$runtime_project" == kaori-website && "$runtime_port" == 18080 ]] ||
    fail 'existing public edge is registered for canonical Website runtime only'
fi
port="$(printenv WEBSITE_SSH_PORT || true)"
if [[ -z "$port" ]]; then port=22; fi
[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( port >= 1 && port <= 65535 )) ||
  fail 'production SSH port invalid'

umask 077
tmp="$(mktemp -d)"
agent_started=false
cleanup() {
  if [[ "$agent_started" == true ]]; then ssh-agent -k >/dev/null 2>&1 || true; fi
  rm -rf -- "$tmp"
}
trap cleanup EXIT INT TERM
chmod 700 "$tmp"
mkdir -m 700 "$tmp/docker"
printf '%s\n' "$WEBSITE_SSH_KEY" >"$tmp/key"
printf '%s\n' "$WEBSITE_KNOWN_HOSTS" >"$tmp/known_hosts"
chmod 600 "$tmp/key" "$tmp/known_hosts"
host_id="$WEBSITE_HOST"
if [[ "$port" != 22 ]]; then host_id="[$WEBSITE_HOST]:$port"; fi
ssh-keygen -F "$host_id" -f "$tmp/known_hosts" >/dev/null ||
  fail 'pinned Website host identity unavailable'
cat >"$tmp/askpass" <<'ASKPASS'
#!/usr/bin/env bash
printf '%s\n' "$WEBSITE_SSH_PASSPHRASE"
ASKPASS
chmod 700 "$tmp/askpass"
eval "$(ssh-agent -s)" >/dev/null
agent_started=true
export SSH_ASKPASS="$tmp/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=:0
setsid -w ssh-add "$tmp/key" </dev/null >/dev/null

# Read-only probe of the actual configured production runtime. An existing
# matching digest must not be redeployed; a healthy different accepted runtime
# can be replaced only AFTER OCI signature/attestation verification below.
probe_target() {
  {
    printf 'set -Eeuo pipefail\n'
    printf 'expected_image=%q\nexpected_sha=%q\nexpected_rc=%q\nroot=%q\n' \
      "$image_ref" "$rc_sha" "$rc_tag" "$WEBSITE_DEPLOY_ROOT"
    printf 'runtime_state=%q\nruntime_project=%q\nruntime_port=%q\nruntime_edge=%q\n' \
      "$runtime_state" "$runtime_project" "$runtime_port" "$runtime_edge"
    cat <<'REMOTE_PROBE'
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ -d "$root" && ! -L "$root" && -w "$root" ]] ||
  fail 'production target root is not prepared'
[[ -d "$runtime_state" && ! -L "$runtime_state" && -r "$runtime_state" &&
   -w "$runtime_state" ]] || fail 'production receipt directory is not prepared'
receipt="$runtime_state/release.env"
previous="$runtime_state/previous-release.env"
[[ -f "$receipt" && ! -L "$receipt" ]] ||
  fail 'production target needs an independently prepared prior receipt and rollback'
current_image="$(grep '^KAORI_WEBSITE_IMAGE=' "$receipt" | cut -d= -f2-)"
current_sha="$(grep '^KAORI_WEBSITE_SOURCE_SHA=' "$receipt" | cut -d= -f2-)"
current_version="$(grep '^KAORI_WEBSITE_VERSION=' "$receipt" | cut -d= -f2-)"
[[ "$current_image" =~ @sha256:[a-f0-9]{64}$ &&
   "$current_sha" =~ ^[a-f0-9]{40}$ &&
   "$current_version" =~ ^v[0-9]+[.][0-9]+[.][0-9]+(-rc[.][1-9][0-9]*)?$ ]] ||
  fail 'production current receipt is invalid; never replace an unmanaged image'
web="$(docker ps --filter "label=com.docker.compose.project=$runtime_project" \
  --filter label=com.docker.compose.service=web --format '{{.ID}}')"
[[ "$web" =~ ^[a-f0-9]{12,64}$ ]] ||
  fail 'production current container is missing or ambiguous'
[[ "$(docker inspect --format '{{.Config.Image}}' "$web")" == "$current_image" ]] ||
  fail 'production live image differs from its committed receipt'
[[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$web")" == healthy ]] ||
  fail 'production current container is unhealthy; manual recovery required'
if [[ "$current_image" == "$expected_image" &&
      "$current_sha" == "$expected_sha" &&
      "$current_version" == "$expected_rc" ]]; then
  [[ -s "$previous" && ! -L "$previous" ]] ||
    fail 'previous immutable rollback receipt missing'
  previous_image="$(grep '^KAORI_WEBSITE_IMAGE=' "$previous" | cut -d= -f2-)"
  [[ "$previous_image" =~ @sha256:[a-f0-9]{64}$ ]] ||
    fail 'previous immutable rollback digest evidence invalid'
  export KAORI_WEBSITE_IMAGE="$expected_image"
  export KAORI_WEBSITE_EXPECTED_VERSION="$expected_rc"
  export KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1
  export KAORI_WEBSITE_RUNTIME_ENV=production
  export KAORI_WEBSITE_STATE_DIR="$runtime_state"
  export KAORI_WEBSITE_LOOPBACK_PORT="$runtime_port"
  export COMPOSE_PROJECT_NAME="$runtime_project"
  bash "$root/releases/$expected_sha/server/verify.sh" ||
    fail 'configured production runtime verification failed'
  if [[ "$runtime_edge" == 1 ]]; then
    [[ "$(docker inspect --format '{{if index .NetworkSettings.Networks "edge-public"}}true{{else}}false{{end}}' "$web")" == true ]] ||
      fail 'accepted Website is detached from existing shared edge'
  else
    fail 'configured production runtime has no approved edge evidence yet'
  fi
  echo 'TARGET_STATUS:READY'
else
  # The previous signed image remains rollback authority during replacement.
  echo 'TARGET_STATUS:DEPLOY'
fi
REMOTE_PROBE
  } | ssh -p "$port" -i "$tmp/key" -o BatchMode=yes -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$tmp/known_hosts" \
    "$WEBSITE_SSH_USER@$WEBSITE_HOST" 'bash -se'
}

# Independently validate the exact subject signed by the current or legacy RC publisher.
printf '%s' "$REGISTRY_PASSWORD" | DOCKER_CONFIG="$tmp/docker" docker login "$REGISTRY_HOST" \
  --username "$REGISTRY_USER" --password-stdin >/dev/null
identity=''
for workflow in quality.yml publish-staging-image.yml; do
  for branch in kaori/staging kaori/rc-request; do
    [[ "$workflow" != quality.yml || "$branch" == kaori/staging ]] || continue
    candidate="https://github.com/OXY7O/kaori-website/.github/workflows/$workflow@refs/heads/$branch"
    if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
      -v "$tmp/docker:/root/.docker:ro" ghcr.io/sigstore/cosign/cosign:v3.1.3 verify \
      --certificate-identity "$candidate" --certificate-oidc-issuer https://token.actions.githubusercontent.com \
      "$image_ref" >"$tmp/signature.json" 2>/dev/null; then identity="$candidate"; break; fi
  done
  [[ -z "$identity" ]] || break
done
[[ -n "$identity" && -s "$tmp/signature.json" ]] ||
  fail 'accepted digest does not verify with approved RC signer'
for kind in spdxjson slsaprovenance1; do
  docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
    -v "$tmp/docker:/root/.docker:ro" ghcr.io/sigstore/cosign/cosign:v3.1.3 verify-attestation \
    --type "$kind" --certificate-identity "$identity" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    "$image_ref" >"$tmp/$kind.json" || fail "signed $kind attestation failed"
done
# Never mutate a target before accepted digest signature AND both attestations.
# Existing same-digest production runtime remains unchanged. A different
# healthy, receipt-backed runtime is reconciled using the existing RC adapter.
[[ "$runtime_edge" == 1 ]] ||
  fail 'production target requires independently admitted provider edge before deployment'
target_probe="$(probe_target)" || fail 'production runtime read-only probe failed'
target_action=verified
if grep -Fxq 'TARGET_STATUS:DEPLOY' <<<"$target_probe"; then
  echo 'NOTE: configured production target differs from accepted signed RC; governed replacement required'
  ACCEPTED_SHA="$rc_sha" RC_TAG="$rc_tag" \
    APPROVAL_REF="https://github.com/OXY7O/kaori-website/pull/$pr" \
    bash scripts/release/deploy-release.sh preflight
  ACCEPTED_SHA="$rc_sha" RC_TAG="$rc_tag" \
    APPROVAL_REF="https://github.com/OXY7O/kaori-website/pull/$pr" \
    bash scripts/release/deploy-release.sh deploy
  verified_probe="$(probe_target)" || fail 'production post-deployment verification failed'
  grep -Fxq 'TARGET_STATUS:READY' <<<"$verified_probe" ||
    fail 'production post-deployment digest is not accepted'
  target_action=replaced
elif grep -Fxq 'TARGET_STATUS:READY' <<<"$target_probe"; then
  echo 'PASS: configured production runtime already runs accepted digest; no replacement'
else
  fail 'production runtime probe returned an unknown result'
fi

for domain in kaori.cloud app.kaori.cloud docs.kaori.cloud; do
  curl -fLsS --connect-timeout 10 --max-time 25 -o /dev/null "https://$domain/" ||
    fail "trusted HTTPS readiness failed for $domain"
done

if [[ "$existing" == 404 ]]; then
  body="$(jq -n --arg stable "$stable_tag" --arg main "$GITHUB_SHA" \
    --arg rc "$rc_tag" --arg rcsha "$rc_sha" --arg digest "$digest" \
    --arg image "$image_ref" --arg uat "$evidence_url" --arg pr "$pr" --arg run "$GITHUB_RUN_ID" '
    ["KAORI Website stable artifact: " + $stable, "Stable main SHA: " + $main,
     "Accepted RC: " + $rc, "Accepted RC source SHA: " + $rcsha,
     "Immutable digest: " + $digest, "Deployment authority: " + $image,
     "Human UAT evidence: " + $uat, "Merged promotion PR: #" + $pr,
     "Production environment approved run: " + $run,
     "Exact live RC digest and signed OCI attestations reverified; no rebuild or retag."] | join("\n")')"
  payload="$(jq -n --arg tag "$stable_tag" --arg sha "$GITHUB_SHA" --arg body "$body" \
    '{tag_name:$tag,target_commitish:$sha,name:("KAORI Website "+$tag),body:$body,
      draft:false,prerelease:false,make_latest:"true"}')"
  published="$(curl --fail-with-body -sS -H "Authorization: Bearer $GH_TOKEN" \
    -H 'Accept: application/vnd.github+json' -H 'Content-Type: application/json' \
    -X POST --data "$payload" "$api/releases")" ||
    fail 'stable publication failed; inspect reserved tag before retry'
  [[ "$(jq -r '.tag_name' <<<"$published")" == "$stable_tag" ]] ||
    fail 'published stable identity mismatch'
else
  echo "PASS: already-published exact stable $stable_tag reused without mutation"
fi
[[ "$(api_get "$api/git/ref/tags/$stable_tag" | jq -r '.object.sha')" == "$GITHUB_SHA" ]] ||
  fail 'stable tag does not identify exact accepted main'
printf 'PASS: accepted stable %s from RC %s at signed digest %s; runtime %s, no image rebuild\n' \
  "$stable_tag" "$rc_tag" "$digest" "$target_action"
printf 'Stable Release: %s\nMain SHA: %s\nRC: %s\nImmutable OCI: %s\n' \
  "$stable_tag" "$GITHUB_SHA" "$rc_tag" "$image_ref" >>"$GITHUB_STEP_SUMMARY"
