#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:?expected resolve, preflight or publish}"
[[ "$mode" == resolve || "$mode" == preflight || "$mode" == publish ]] || { echo 'BLOCK: invalid RC operation' >&2; exit 1; }
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
repo="${GITHUB_REPOSITORY:?}"
sha="${ACCEPTED_SHA:?}"
tag="${RC_TAG:-}"
host="${REGISTRY_HOST:-}"
image="${REGISTRY_IMAGE:-}"
api="https://api.github.com/repos/$repo"
headers=(-H "Authorization: Bearer ${GH_TOKEN:?}" -H 'Accept: application/vnd.github+json')

# Exact-source automatic RC selection, from the same source-locked signer.
if [[ "$mode" == resolve ]]; then
  [[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/kaori/staging ]] ||
    fail 'automatic RC resolution must target protected staging push'
  [[ "$(printenv KAORI_WEBSITE_STAGING_AUTO || true)" == 1 ]] ||
    fail 'automatic RC resolution is not enabled'
  [[ "$GITHUB_WORKFLOW_REF" == "$repo/.github/workflows/quality.yml@refs/heads/kaori/staging" ]] ||
    fail 'RC resolver requires canonical Full Admission workflow identity'
  [[ -n "$(printenv GITHUB_OUTPUT || true)" ]] || fail 'RC resolver output unavailable'
  [[ "$(git rev-parse HEAD)" == "$sha" ]] || fail 'RC resolver checkout SHA mismatch'
  current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
  [[ "$current" == "$sha" ]] || fail 'staging SHA changed before RC selection'
  already="$(git tag --points-at "$sha" | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*auto_staging=false
if [[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/kaori/staging &&
      "$(printenv KAORI_WEBSITE_STAGING_AUTO || true)" == 1 ]]; then
  [[ "$GITHUB_WORKFLOW_REF" == "$repo/.github/workflows/quality.yml@refs/heads/kaori/staging" ]] ||
    fail 'automatic staging RC requires canonical Full Admission workflow identity'
  auto_staging=true
elif [[ "$GITHUB_EVENT_NAME" == push ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/rc-request ]] || fail 'push RC request must use kaori/rc-request'
elif [[ "$GITHUB_EVENT_NAME" == workflow_dispatch ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'manual RC dispatch must use kaori/staging'
else
  fail 'unsupported RC request event'
fi
[[ "$(git rev-parse HEAD)" == "$sha" ]] || fail 'source mismatch'
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'candidate must use vX.Y.Z-rc.N'
[[ -n "$host" && "$image" == "$host/"* && "$host" != *://* ]] || fail 'registry variables missing or inconsistent'
[[ "$image" == */kaori-website ]] || fail 'website image must use dedicated /kaori-website repository, never KAORI Application image'
[[ -n "${REGISTRY_USER:-}" && -n "${REGISTRY_PASSWORD:-}" ]] || fail 'registry credentials missing'
command -v jq >/dev/null && command -v curl >/dev/null && docker info >/dev/null || fail 'runner prerequisites unavailable'
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
[[ "$current" == "$sha" ]] || fail 'staging source changed'
if [[ "$auto_staging" == true ]]; then
  # This publisher job can only run with 4/4 required needs success.
  # The same workflow run remains in_progress until this job finishes.
  echo 'PASS: canonical four-job Full Admission dependencies succeeded'
else
  runs="$(curl -fsS "${headers[@]}" "$api/actions/workflows/quality.yml/runs?branch=kaori%2Fstaging&event=push&per_page=100")"
  matched="$(jq -c --arg sha "$sha" '[.workflow_runs[] | select(.head_sha==$sha)] | sort_by(.run_number) | last // empty' <<< "$runs")"
  [[ -n "$matched" ]] || fail 'missing Full Admission run for exact staging SHA'
  [[ "$(jq -r '.status' <<< "$matched")" == completed && "$(jq -r '.conclusion' <<< "$matched")" == success ]] || fail 'Full Admission not PASS'
  echo "Full Admission: $(jq -r '.html_url' <<< "$matched")"
fi
if [[ "$mode" == preflight ]]; then
  # Private repositories use an API-authenticated lookup; checkout intentionally does
  # not persist write-capable credentials into Git configuration.
  tag_status="$(curl -sS -o /dev/null -w '%{http_code}' "${headers[@]}" "$api/git/ref/tags/$tag")"
  case "$tag_status" in
    404) ;;
    200) fail 'candidate tag already reserved' ;;
    *) fail "GitHub tag authority check failed (HTTP $tag_status)" ;;
  esac
  printf 'PASS: RC config and admitted source validated (%s)\n' "$sha"
  exit 0
fi

created="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker build --platform linux/amd64 --target production \
  --build-arg APP_BUILD_SHA="$sha" --build-arg APP_VERSION="${tag#v}" \
  --build-arg APP_BUILD_DATE="$created" --tag "$image:$tag" .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy aquasec/trivy:0.74.0 \
  image --cache-dir /root/.cache/trivy --exit-code 1 --ignore-unfixed \
  --scanners vuln --severity HIGH,CRITICAL "$image:$tag"
docker run --rm --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh "$image:$tag" \
  -ec 'test "$(id -u)" != 0; nginx -t; test -s /usr/share/nginx/html/index.html'
printf '%s' "$REGISTRY_PASSWORD" | docker login "$host" --username "$REGISTRY_USER" --password-stdin
error="$(mktemp)"
trap 'rm -f "$error"' EXIT
if docker manifest inspect "$image:$tag" >/dev/null 2>"$error"; then
  fail 'RC registry tag already exists'
fi
grep -Eqi 'manifest unknown|no such manifest|not found' "$error" || fail 'registry returned an inconclusive error'
jq -nc --arg ref "refs/tags/$tag" --arg object "$sha" '{ref:$ref,sha:$object}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' -X POST \
    --data-binary @- "$api/git/refs" >/dev/null
docker push "$image:$tag"
docker pull "$image:$tag"
qualified="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image:$tag")"
digest="${qualified#*@}"
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'registry did not return OCI digest'
ref="$image@$digest"
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$ref")"
version="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$ref")"
[[ "$revision" == "$sha" && "$version" == "${tag#v}" ]] || fail 'immutable image labels differ from accepted source'
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy -v "$PWD:/workspace" \
  aquasec/trivy:0.74.0 image --cache-dir /root/.cache/trivy \
  --format spdx-json --output /workspace/website-sbom.spdx.json "$ref"
test -s website-sbom.spdx.json
jq -n --arg src "$repo" --arg source_sha "$sha" --arg run "$GITHUB_RUN_ID" \
  '{buildDefinition:{buildType:"https://slsa.dev/provenance/v1",
     resolvedDependencies:[{uri:("https://github.com/"+$src),digest:{gitCommit:$source_sha}}]},
    runDetails:{builder:{id:("https://github.com/"+$src+"/actions/runs/"+$run)},
      metadata:{invocationId:$run}}}' > website-provenance.json
identity="https://github.com/$GITHUB_WORKFLOW_REF"
# Sign the immutable image itself before independently attesting its evidence.
docker run --rm --user 0:0 \
  -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
  -e DOCKER_CONFIG=/root/.docker \
  -v "$HOME/.docker:/root/.docker:ro" \
  ghcr.io/sigstore/cosign/cosign:v3.1.3 sign --yes "$ref"
# Registry OCI referrers may propagate after sign returns. Preserve every trust
# requirement; retry only the mandatory cryptographic verification, never skip it.
signature_verified=false
for attempt in $(seq 1 8); do
  if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 verify \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com "$ref" > website-signature-verification.json; then
    signature_verified=true
    break
  fi
  printf 'Signature not yet verifiable (attempt %s/8); preserving fail-closed policy\n' "$attempt" >&2
  if (( attempt < 8 )); then sleep 15; fi
done
[[ "$signature_verified" == true ]] || fail 'mandatory signature verification exhausted bounded registry retries'
test -s website-signature-verification.json
for entry in 'website-sbom.spdx.json:spdxjson' 'website-provenance.json:slsaprovenance1'; do
  predicate="${entry%%:*}"
  kind="${entry#*:}"
  docker run --rm --user 0:0 \
    -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
    -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" -v "$PWD:/workspace:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 attest --yes \
    --predicate "/workspace/$predicate" --type "$kind" "$ref"
done
for kind in spdxjson slsaprovenance1; do
  attestation_verified=false
  for attempt in $(seq 1 8); do
    if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
      -v "$HOME/.docker:/root/.docker:ro" \
      ghcr.io/sigstore/cosign/cosign:v3.1.3 verify-attestation \
      --certificate-identity "$identity" \
      --certificate-oidc-issuer https://token.actions.githubusercontent.com \
      --type "$kind" "$ref" > "verification-$kind.json"; then
      attestation_verified=true
      break
    fi
    printf 'Attestation %s not yet verifiable (attempt %s/8)\n' "$kind" "$attempt" >&2
    if (( attempt < 8 )); then sleep 15; fi
  done
  [[ "$attestation_verified" == true ]] || fail "mandatory $kind attestation verification exhausted bounded registry retries"
  test -s "verification-$kind.json"
done
sbom_sha="sha256:$(sha256sum website-sbom.spdx.json | awk '{print $1}')"
jq -n --arg tag "$tag" --arg sha "$sha" --arg digest "$digest" \
  --arg image "$ref" --arg sbom "$sbom_sha" \
  '{tag_name:$tag,target_commitish:$sha,name:("KAORI Website "+$tag),
    body:("Staging source SHA: "+$sha+"\nImmutable digest: "+$digest+
    "\nDeployment authority: "+$image+"\nSPDX SBOM SHA256: "+$sbom+
    "\nTrivy security and signed SBOM/provenance: PASS\nRelease verification: PENDING; human acceptance required."),
    draft:false,prerelease:true,make_latest:"false"}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' \
    -X POST --data-binary @- "$api/releases" >/dev/null
printf 'PASS: candidate %s built from %s and published at %s; release verification pending\n' "$tag" "$sha" "$ref"
 || true)"
  if [[ -n "$already" ]]; then
    [[ "$(printf '%s\n' "$already" | wc -l)" -eq 1 ]] || fail 'ambiguous signed RC tags on same SHA'
    published="$(curl -fsS "${headers[@]}" "$api/releases/tags/$already")" ||
      fail 'RC tag exists without complete release evidence'
    [[ "$(jq -r '.prerelease' <<<"$published")" == true &&
       "$(jq -r '.target_commitish' <<<"$published")" == "$sha" ]] ||
      fail 'same-source prerelease metadata differs'
    jq -er '.body | contains("Immutable digest: sha256:")' <<<"$published" >/dev/null ||
      fail 'same-source RC immutable digest evidence missing'
    printf 'tag=%s\nshould_publish=false\n' "$already" >> "$GITHUB_OUTPUT"
    echo "PASS: signed RC $already already published for exact staging"
    exit 0
  fi
  base="$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname |
    grep -E '^v[0-9]+\.[0-9]+\.[0-9]+auto_staging=false
if [[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/kaori/staging &&
      "$(printenv KAORI_WEBSITE_STAGING_AUTO || true)" == 1 ]]; then
  [[ "$GITHUB_WORKFLOW_REF" == "$repo/.github/workflows/quality.yml@refs/heads/kaori/staging" ]] ||
    fail 'automatic staging RC requires canonical Full Admission workflow identity'
  auto_staging=true
elif [[ "$GITHUB_EVENT_NAME" == push ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/rc-request ]] || fail 'push RC request must use kaori/rc-request'
elif [[ "$GITHUB_EVENT_NAME" == workflow_dispatch ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'manual RC dispatch must use kaori/staging'
else
  fail 'unsupported RC request event'
fi
[[ "$(git rev-parse HEAD)" == "$sha" ]] || fail 'source mismatch'
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'candidate must use vX.Y.Z-rc.N'
[[ -n "$host" && "$image" == "$host/"* && "$host" != *://* ]] || fail 'registry variables missing or inconsistent'
[[ "$image" == */kaori-website ]] || fail 'website image must use dedicated /kaori-website repository, never KAORI Application image'
[[ -n "${REGISTRY_USER:-}" && -n "${REGISTRY_PASSWORD:-}" ]] || fail 'registry credentials missing'
command -v jq >/dev/null && command -v curl >/dev/null && docker info >/dev/null || fail 'runner prerequisites unavailable'
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
[[ "$current" == "$sha" ]] || fail 'staging source changed'
if [[ "$auto_staging" == true ]]; then
  # This publisher job can only run with 4/4 required needs success.
  # The same workflow run remains in_progress until this job finishes.
  echo 'PASS: canonical four-job Full Admission dependencies succeeded'
else
  runs="$(curl -fsS "${headers[@]}" "$api/actions/workflows/quality.yml/runs?branch=kaori%2Fstaging&event=push&per_page=100")"
  matched="$(jq -c --arg sha "$sha" '[.workflow_runs[] | select(.head_sha==$sha)] | sort_by(.run_number) | last // empty' <<< "$runs")"
  [[ -n "$matched" ]] || fail 'missing Full Admission run for exact staging SHA'
  [[ "$(jq -r '.status' <<< "$matched")" == completed && "$(jq -r '.conclusion' <<< "$matched")" == success ]] || fail 'Full Admission not PASS'
  echo "Full Admission: $(jq -r '.html_url' <<< "$matched")"
fi
if [[ "$mode" == preflight ]]; then
  # Private repositories use an API-authenticated lookup; checkout intentionally does
  # not persist write-capable credentials into Git configuration.
  tag_status="$(curl -sS -o /dev/null -w '%{http_code}' "${headers[@]}" "$api/git/ref/tags/$tag")"
  case "$tag_status" in
    404) ;;
    200) fail 'candidate tag already reserved' ;;
    *) fail "GitHub tag authority check failed (HTTP $tag_status)" ;;
  esac
  printf 'PASS: RC config and admitted source validated (%s)\n' "$sha"
  exit 0
fi

created="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker build --platform linux/amd64 --target production \
  --build-arg APP_BUILD_SHA="$sha" --build-arg APP_VERSION="${tag#v}" \
  --build-arg APP_BUILD_DATE="$created" --tag "$image:$tag" .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy aquasec/trivy:0.74.0 \
  image --cache-dir /root/.cache/trivy --exit-code 1 --ignore-unfixed \
  --scanners vuln --severity HIGH,CRITICAL "$image:$tag"
docker run --rm --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh "$image:$tag" \
  -ec 'test "$(id -u)" != 0; nginx -t; test -s /usr/share/nginx/html/index.html'
printf '%s' "$REGISTRY_PASSWORD" | docker login "$host" --username "$REGISTRY_USER" --password-stdin
error="$(mktemp)"
trap 'rm -f "$error"' EXIT
if docker manifest inspect "$image:$tag" >/dev/null 2>"$error"; then
  fail 'RC registry tag already exists'
fi
grep -Eqi 'manifest unknown|no such manifest|not found' "$error" || fail 'registry returned an inconclusive error'
jq -nc --arg ref "refs/tags/$tag" --arg object "$sha" '{ref:$ref,sha:$object}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' -X POST \
    --data-binary @- "$api/git/refs" >/dev/null
docker push "$image:$tag"
docker pull "$image:$tag"
qualified="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image:$tag")"
digest="${qualified#*@}"
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'registry did not return OCI digest'
ref="$image@$digest"
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$ref")"
version="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$ref")"
[[ "$revision" == "$sha" && "$version" == "${tag#v}" ]] || fail 'immutable image labels differ from accepted source'
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy -v "$PWD:/workspace" \
  aquasec/trivy:0.74.0 image --cache-dir /root/.cache/trivy \
  --format spdx-json --output /workspace/website-sbom.spdx.json "$ref"
test -s website-sbom.spdx.json
jq -n --arg src "$repo" --arg source_sha "$sha" --arg run "$GITHUB_RUN_ID" \
  '{buildDefinition:{buildType:"https://slsa.dev/provenance/v1",
     resolvedDependencies:[{uri:("https://github.com/"+$src),digest:{gitCommit:$source_sha}}]},
    runDetails:{builder:{id:("https://github.com/"+$src+"/actions/runs/"+$run)},
      metadata:{invocationId:$run}}}' > website-provenance.json
identity="https://github.com/$GITHUB_WORKFLOW_REF"
# Sign the immutable image itself before independently attesting its evidence.
docker run --rm --user 0:0 \
  -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
  -e DOCKER_CONFIG=/root/.docker \
  -v "$HOME/.docker:/root/.docker:ro" \
  ghcr.io/sigstore/cosign/cosign:v3.1.3 sign --yes "$ref"
# Registry OCI referrers may propagate after sign returns. Preserve every trust
# requirement; retry only the mandatory cryptographic verification, never skip it.
signature_verified=false
for attempt in $(seq 1 8); do
  if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 verify \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com "$ref" > website-signature-verification.json; then
    signature_verified=true
    break
  fi
  printf 'Signature not yet verifiable (attempt %s/8); preserving fail-closed policy\n' "$attempt" >&2
  if (( attempt < 8 )); then sleep 15; fi
done
[[ "$signature_verified" == true ]] || fail 'mandatory signature verification exhausted bounded registry retries'
test -s website-signature-verification.json
for entry in 'website-sbom.spdx.json:spdxjson' 'website-provenance.json:slsaprovenance1'; do
  predicate="${entry%%:*}"
  kind="${entry#*:}"
  docker run --rm --user 0:0 \
    -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
    -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" -v "$PWD:/workspace:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 attest --yes \
    --predicate "/workspace/$predicate" --type "$kind" "$ref"
done
for kind in spdxjson slsaprovenance1; do
  attestation_verified=false
  for attempt in $(seq 1 8); do
    if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
      -v "$HOME/.docker:/root/.docker:ro" \
      ghcr.io/sigstore/cosign/cosign:v3.1.3 verify-attestation \
      --certificate-identity "$identity" \
      --certificate-oidc-issuer https://token.actions.githubusercontent.com \
      --type "$kind" "$ref" > "verification-$kind.json"; then
      attestation_verified=true
      break
    fi
    printf 'Attestation %s not yet verifiable (attempt %s/8)\n' "$kind" "$attempt" >&2
    if (( attempt < 8 )); then sleep 15; fi
  done
  [[ "$attestation_verified" == true ]] || fail "mandatory $kind attestation verification exhausted bounded registry retries"
  test -s "verification-$kind.json"
done
sbom_sha="sha256:$(sha256sum website-sbom.spdx.json | awk '{print $1}')"
jq -n --arg tag "$tag" --arg sha "$sha" --arg digest "$digest" \
  --arg image "$ref" --arg sbom "$sbom_sha" \
  '{tag_name:$tag,target_commitish:$sha,name:("KAORI Website "+$tag),
    body:("Staging source SHA: "+$sha+"\nImmutable digest: "+$digest+
    "\nDeployment authority: "+$image+"\nSPDX SBOM SHA256: "+$sbom+
    "\nTrivy security and signed SBOM/provenance: PASS\nRelease verification: PENDING; human acceptance required."),
    draft:false,prerelease:true,make_latest:"false"}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' \
    -X POST --data-binary @- "$api/releases" >/dev/null
printf 'PASS: candidate %s built from %s and published at %s; release verification pending\n' "$tag" "$sha" "$ref"
 | head -n1 || true)"
  [[ -n "$base" ]] || fail 'stable SemVer base tag unavailable'
  version="$(printf '%s' "$base" | sed 's/^v//' | awk -F. '{printf "%d.%d.%d", $1, $2, $3 + 1}')"
  highest=0
  while IFS= read -r used; do
    [[ -n "$used" ]] || continue
    suffix="$(printf '%s' "$used" | awk -F. '{print $4}')"
    [[ "$suffix" =~ ^[1-9][0-9]*$ ]] || continue
    if (( 10#$suffix > highest )); then highest=$((10#$suffix)); fi
  done < <(git tag --list "v$version-rc.*")
  chosen="v$version-rc.$((highest + 1))"
  status="$(curl -sS -o /dev/null -w '%{http_code}' "${headers[@]}" "$api/git/ref/tags/$chosen")"
  [[ "$status" == 404 ]] || fail 'next RC tag already reserved or lookup failed'
  printf 'tag=%s\nshould_publish=true\n' "$chosen" >> "$GITHUB_OUTPUT"
  echo "PASS: selected immutable candidate $chosen for $sha"
  exit 0
fi
auto_staging=false
if [[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/kaori/staging &&
      "$(printenv KAORI_WEBSITE_STAGING_AUTO || true)" == 1 ]]; then
  [[ "$GITHUB_WORKFLOW_REF" == "$repo/.github/workflows/quality.yml@refs/heads/kaori/staging" ]] ||
    fail 'automatic staging RC requires canonical Full Admission workflow identity'
  auto_staging=true
elif [[ "$GITHUB_EVENT_NAME" == push ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/rc-request ]] || fail 'push RC request must use kaori/rc-request'
elif [[ "$GITHUB_EVENT_NAME" == workflow_dispatch ]]; then
  [[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'manual RC dispatch must use kaori/staging'
else
  fail 'unsupported RC request event'
fi
[[ "$(git rev-parse HEAD)" == "$sha" ]] || fail 'source mismatch'
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'candidate must use vX.Y.Z-rc.N'
[[ -n "$host" && "$image" == "$host/"* && "$host" != *://* ]] || fail 'registry variables missing or inconsistent'
[[ "$image" == */kaori-website ]] || fail 'website image must use dedicated /kaori-website repository, never KAORI Application image'
[[ -n "${REGISTRY_USER:-}" && -n "${REGISTRY_PASSWORD:-}" ]] || fail 'registry credentials missing'
command -v jq >/dev/null && command -v curl >/dev/null && docker info >/dev/null || fail 'runner prerequisites unavailable'
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
[[ "$current" == "$sha" ]] || fail 'staging source changed'
if [[ "$auto_staging" == true ]]; then
  # This publisher job can only run with 4/4 required needs success.
  # The same workflow run remains in_progress until this job finishes.
  echo 'PASS: canonical four-job Full Admission dependencies succeeded'
else
  runs="$(curl -fsS "${headers[@]}" "$api/actions/workflows/quality.yml/runs?branch=kaori%2Fstaging&event=push&per_page=100")"
  matched="$(jq -c --arg sha "$sha" '[.workflow_runs[] | select(.head_sha==$sha)] | sort_by(.run_number) | last // empty' <<< "$runs")"
  [[ -n "$matched" ]] || fail 'missing Full Admission run for exact staging SHA'
  [[ "$(jq -r '.status' <<< "$matched")" == completed && "$(jq -r '.conclusion' <<< "$matched")" == success ]] || fail 'Full Admission not PASS'
  echo "Full Admission: $(jq -r '.html_url' <<< "$matched")"
fi
if [[ "$mode" == preflight ]]; then
  # Private repositories use an API-authenticated lookup; checkout intentionally does
  # not persist write-capable credentials into Git configuration.
  tag_status="$(curl -sS -o /dev/null -w '%{http_code}' "${headers[@]}" "$api/git/ref/tags/$tag")"
  case "$tag_status" in
    404) ;;
    200) fail 'candidate tag already reserved' ;;
    *) fail "GitHub tag authority check failed (HTTP $tag_status)" ;;
  esac
  printf 'PASS: RC config and admitted source validated (%s)\n' "$sha"
  exit 0
fi

created="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker build --platform linux/amd64 --target production \
  --build-arg APP_BUILD_SHA="$sha" --build-arg APP_VERSION="${tag#v}" \
  --build-arg APP_BUILD_DATE="$created" --tag "$image:$tag" .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy aquasec/trivy:0.74.0 \
  image --cache-dir /root/.cache/trivy --exit-code 1 --ignore-unfixed \
  --scanners vuln --severity HIGH,CRITICAL "$image:$tag"
docker run --rm --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --entrypoint /bin/sh "$image:$tag" \
  -ec 'test "$(id -u)" != 0; nginx -t; test -s /usr/share/nginx/html/index.html'
printf '%s' "$REGISTRY_PASSWORD" | docker login "$host" --username "$REGISTRY_USER" --password-stdin
error="$(mktemp)"
trap 'rm -f "$error"' EXIT
if docker manifest inspect "$image:$tag" >/dev/null 2>"$error"; then
  fail 'RC registry tag already exists'
fi
grep -Eqi 'manifest unknown|no such manifest|not found' "$error" || fail 'registry returned an inconclusive error'
jq -nc --arg ref "refs/tags/$tag" --arg object "$sha" '{ref:$ref,sha:$object}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' -X POST \
    --data-binary @- "$api/git/refs" >/dev/null
docker push "$image:$tag"
docker pull "$image:$tag"
qualified="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image:$tag")"
digest="${qualified#*@}"
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'registry did not return OCI digest'
ref="$image@$digest"
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$ref")"
version="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.version"}}' "$ref")"
[[ "$revision" == "$sha" && "$version" == "${tag#v}" ]] || fail 'immutable image labels differ from accepted source'
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v kaori-website-trivy-cache:/root/.cache/trivy -v "$PWD:/workspace" \
  aquasec/trivy:0.74.0 image --cache-dir /root/.cache/trivy \
  --format spdx-json --output /workspace/website-sbom.spdx.json "$ref"
test -s website-sbom.spdx.json
jq -n --arg src "$repo" --arg source_sha "$sha" --arg run "$GITHUB_RUN_ID" \
  '{buildDefinition:{buildType:"https://slsa.dev/provenance/v1",
     resolvedDependencies:[{uri:("https://github.com/"+$src),digest:{gitCommit:$source_sha}}]},
    runDetails:{builder:{id:("https://github.com/"+$src+"/actions/runs/"+$run)},
      metadata:{invocationId:$run}}}' > website-provenance.json
identity="https://github.com/$GITHUB_WORKFLOW_REF"
# Sign the immutable image itself before independently attesting its evidence.
docker run --rm --user 0:0 \
  -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
  -e DOCKER_CONFIG=/root/.docker \
  -v "$HOME/.docker:/root/.docker:ro" \
  ghcr.io/sigstore/cosign/cosign:v3.1.3 sign --yes "$ref"
# Registry OCI referrers may propagate after sign returns. Preserve every trust
# requirement; retry only the mandatory cryptographic verification, never skip it.
signature_verified=false
for attempt in $(seq 1 8); do
  if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 verify \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com "$ref" > website-signature-verification.json; then
    signature_verified=true
    break
  fi
  printf 'Signature not yet verifiable (attempt %s/8); preserving fail-closed policy\n' "$attempt" >&2
  if (( attempt < 8 )); then sleep 15; fi
done
[[ "$signature_verified" == true ]] || fail 'mandatory signature verification exhausted bounded registry retries'
test -s website-signature-verification.json
for entry in 'website-sbom.spdx.json:spdxjson' 'website-provenance.json:slsaprovenance1'; do
  predicate="${entry%%:*}"
  kind="${entry#*:}"
  docker run --rm --user 0:0 \
    -e ACTIONS_ID_TOKEN_REQUEST_TOKEN -e ACTIONS_ID_TOKEN_REQUEST_URL \
    -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" -v "$PWD:/workspace:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 attest --yes \
    --predicate "/workspace/$predicate" --type "$kind" "$ref"
done
for kind in spdxjson slsaprovenance1; do
  attestation_verified=false
  for attempt in $(seq 1 8); do
    if docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
      -v "$HOME/.docker:/root/.docker:ro" \
      ghcr.io/sigstore/cosign/cosign:v3.1.3 verify-attestation \
      --certificate-identity "$identity" \
      --certificate-oidc-issuer https://token.actions.githubusercontent.com \
      --type "$kind" "$ref" > "verification-$kind.json"; then
      attestation_verified=true
      break
    fi
    printf 'Attestation %s not yet verifiable (attempt %s/8)\n' "$kind" "$attempt" >&2
    if (( attempt < 8 )); then sleep 15; fi
  done
  [[ "$attestation_verified" == true ]] || fail "mandatory $kind attestation verification exhausted bounded registry retries"
  test -s "verification-$kind.json"
done
sbom_sha="sha256:$(sha256sum website-sbom.spdx.json | awk '{print $1}')"
jq -n --arg tag "$tag" --arg sha "$sha" --arg digest "$digest" \
  --arg image "$ref" --arg sbom "$sbom_sha" \
  '{tag_name:$tag,target_commitish:$sha,name:("KAORI Website "+$tag),
    body:("Staging source SHA: "+$sha+"\nImmutable digest: "+$digest+
    "\nDeployment authority: "+$image+"\nSPDX SBOM SHA256: "+$sbom+
    "\nTrivy security and signed SBOM/provenance: PASS\nRelease verification: PENDING; human acceptance required."),
    draft:false,prerelease:true,make_latest:"false"}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' \
    -X POST --data-binary @- "$api/releases" >/dev/null
printf 'PASS: candidate %s built from %s and published at %s; release verification pending\n' "$tag" "$sha" "$ref"
