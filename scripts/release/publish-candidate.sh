#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:?expected preflight or publish}"
[[ "$mode" == preflight || "$mode" == publish ]] || { echo 'BLOCK: invalid RC operation' >&2; exit 1; }
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
repo="${GITHUB_REPOSITORY:?}"
sha="${ACCEPTED_SHA:?}"
tag="${RC_TAG:?}"
host="${REGISTRY_HOST:-}"
image="${REGISTRY_IMAGE:-}"
api="https://api.github.com/repos/$repo"
headers=(-H "Authorization: Bearer ${GH_TOKEN:?}" -H 'Accept: application/vnd.github+json')
[[ "$GITHUB_REF" == refs/heads/kaori/staging ]] || fail 'RC dispatch must use kaori/staging'
[[ "$(git rev-parse HEAD)" == "$sha" ]] || fail 'source mismatch'
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[1-9][0-9]*$ ]] || fail 'candidate must use vX.Y.Z-rc.N'
[[ -n "$host" && "$image" == "$host/"* && "$host" != *://* ]] || fail 'registry variables missing or inconsistent'
[[ -n "${REGISTRY_USER:-}" && -n "${REGISTRY_PASSWORD:-}" ]] || fail 'registry credentials missing'
command -v jq >/dev/null && command -v curl >/dev/null && docker info >/dev/null || fail 'runner prerequisites unavailable'
current="$(curl -fsS "${headers[@]}" "$api/git/ref/heads/kaori/staging" | jq -r '.object.sha')"
[[ "$current" == "$sha" ]] || fail 'staging source changed'
runs="$(curl -fsS "${headers[@]}" "$api/actions/workflows/quality.yml/runs?branch=kaori%2Fstaging&event=push&per_page=100")"
matched="$(jq -c --arg sha "$sha" '[.workflow_runs[] | select(.head_sha==$sha)] | sort_by(.run_number) | last // empty' <<< "$runs")"
[[ -n "$matched" ]] || fail 'missing Full Admission run for exact staging SHA'
[[ "$(jq -r '.status' <<< "$matched")" == completed && "$(jq -r '.conclusion' <<< "$matched")" == success ]] || fail 'Full Admission not PASS'
echo "Full Admission: $(jq -r '.html_url' <<< "$matched")"
if [[ "$mode" == preflight ]]; then
  if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null; then
    fail 'candidate tag already reserved'
  fi
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
identity="https://github.com/$repo/.github/workflows/publish-staging-image.yml@$GITHUB_REF"
for kind in spdxjson slsaprovenance1; do
  docker run --rm --user 0:0 -e DOCKER_CONFIG=/root/.docker \
    -v "$HOME/.docker:/root/.docker:ro" \
    ghcr.io/sigstore/cosign/cosign:v3.1.3 verify-attestation \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    --type "$kind" "$ref" > "verification-$kind.json"
  test -s "verification-$kind.json"
done
sbom_sha="sha256:$(sha256sum website-sbom.spdx.json | awk '{print $1}')"
jq -n --arg tag "$tag" --arg sha "$sha" --arg digest "$digest" \
  --arg image "$ref" --arg sbom "$sbom_sha" \
  '{tag_name:$tag,target_commitish:$sha,name:("KAORI Website "+$tag),
    body:("Staging source SHA: "+$sha+"\nImmutable digest: "+$digest+
    "\nDeployment authority: "+$image+"\nSPDX SBOM SHA256: "+$sbom+
    "\nTrivy security and signed SBOM/provenance: PASS\nUAT: PENDING; human acceptance required."),
    draft:false,prerelease:true,make_latest:"false"}' |
  curl -fsS "${headers[@]}" -H 'Content-Type: application/json' \
    -X POST --data-binary @- "$api/releases" >/dev/null
printf 'PASS: candidate %s built from %s and published at %s; UAT pending\n' "$tag" "$sha" "$ref"
