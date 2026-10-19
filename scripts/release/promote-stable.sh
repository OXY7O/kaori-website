#!/usr/bin/env bash
set -Eeuo pipefail

fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
for required in GH_TOKEN STABLE_TAG ACCEPTED_RC_TAG ACCEPTED_RC_SHA ACCEPTED_DIGEST GITHUB_SHA GITHUB_REF GITHUB_REPOSITORY GITHUB_EVENT_PATH; do
  [[ -n "$(printenv "$required" || true)" ]] || fail "missing $required"
done
[[ "$GITHUB_REF" == refs/heads/main ]] || fail 'stable publication requires main'
[[ "$STABLE_TAG" == v0.1.1 && "$ACCEPTED_RC_TAG" == v0.1.1-rc.3 ]] || fail 'release authority mismatch'
[[ "$ACCEPTED_RC_SHA" =~ ^[0-9a-f]{40}$ && "$ACCEPTED_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'invalid candidate identity'
[[ "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]] || fail 'checkout differs from admitted main'
grep -Fq '[KAORI_WEBSITE_STABLE_RELEASE_94]' <<< "$(jq -r '.head_commit.message // ""' "$GITHUB_EVENT_PATH")" || fail 'approval marker absent'
git merge-base --is-ancestor "$ACCEPTED_RC_SHA" HEAD || fail 'accepted RC commit is not in main lineage'
for path in Dockerfile .dockerignore package.json package-lock.json astro.config.mjs tsconfig.json src public deploy; do
  git diff --quiet "$ACCEPTED_RC_SHA" "$GITHUB_SHA" -- "$path" || fail "website build input differs from signed candidate: $path"
done
test -s CHANGELOG.md && test -s docs/releases/v0.1.1.md || fail 'stable notes missing'

api="https://api.github.com/repos/$GITHUB_REPOSITORY"
api_get() { curl -fsS -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "$1"; }
api_status() { curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' "$1"; }

rc="$(api_get "$api/releases/tags/$ACCEPTED_RC_TAG")" || fail 'accepted RC GitHub release absent'
[[ "$(jq -r '.prerelease' <<< "$rc")" == true && "$(jq -r '.target_commitish' <<< "$rc")" == "$ACCEPTED_RC_SHA" ]] || fail 'accepted prerelease mismatch'
grep -Fq "$ACCEPTED_DIGEST" <<< "$(jq -r '.body // ""' <<< "$rc")" || fail 'signed RC digest not evidenced in release'
rc_ref="$(api_get "$api/git/ref/tags/$ACCEPTED_RC_TAG")" || fail 'accepted RC Git tag absent'
[[ "$(jq -r '.object.sha' <<< "$rc_ref")" == "$ACCEPTED_RC_SHA" ]] || fail 'RC tag commit mismatch'
for endpoint in "$api/git/ref/tags/$STABLE_TAG" "$api/releases/tags/$STABLE_TAG"; do
  [[ "$(api_status "$endpoint")" == 404 ]] || fail 'stable tag or release already exists, or lookup failed'
done
curl -fsSL --retry 2 --connect-timeout 10 --max-time 30 https://kaori.cloud/healthz >/dev/null || fail 'public HTTPS health unavailable'

jq -n --arg tag "$STABLE_TAG" --arg sha "$GITHUB_SHA" --rawfile notes docs/releases/v0.1.1.md \
  '{tag_name:$tag, target_commitish:$sha, name:("KAORI Website "+$tag),
    body:$notes, draft:false, prerelease:false, make_latest:"true"}' > /tmp/kaori-stable-release.json
created="$(curl -fsS -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' \
  -H 'Content-Type: application/json' -X POST --data-binary @/tmp/kaori-stable-release.json "$api/releases")" || fail 'stable GitHub Release creation failed'
[[ "$(jq -r '.tag_name' <<< "$created")" == "$STABLE_TAG" && "$(jq -r '.prerelease' <<< "$created")" == false && "$(jq -r '.draft' <<< "$created")" == false ]] || fail 'created release state invalid'
stable_ref="$(api_get "$api/git/ref/tags/$STABLE_TAG")" || fail 'stable Git tag missing'
[[ "$(jq -r '.object.sha' <<< "$stable_ref")" == "$GITHUB_SHA" ]] || fail 'stable tag source mismatch'
url="$(jq -r '.html_url' <<< "$created")"
printf 'PASS: %s uses signed digest %s; %s\n' "$STABLE_TAG" "$ACCEPTED_DIGEST" "$url"
printf 'Stable Release: %s\nImmutable OCI digest: %s\n' "$url" "$ACCEPTED_DIGEST" >> "$GITHUB_STEP_SUMMARY"
