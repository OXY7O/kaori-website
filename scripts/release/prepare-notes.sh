#!/usr/bin/env bash
set -Eeuo pipefail

# Read-only release-note drafting; this never creates a release, tag, or PR.
fail() { printf 'BLOCK: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 1 && "$1" =~ ^v[0-9]+[.][0-9]+[.][0-9]+$ ]] ||
  fail 'usage: bash scripts/release/prepare-notes.sh vX.Y.Z'
command -v gh >/dev/null || fail 'GitHub CLI required'
tag="$1"
repo=OXY7O/kaori-website
previous="$(gh api "repos/$repo/releases/latest" --jq .tag_name)" ||
  fail 'cannot identify last published stable release'
[[ "$previous" =~ ^v[0-9]+[.][0-9]+[.][0-9]+$ ]] ||
  fail 'previous release was not a stable vX.Y.Z'

printf '=== KAORI Website %s — EDITORIAL DRAFT ONLY ===\n' "$tag"
printf 'Last stable baseline: %s\n' "$previous"
printf 'This is GitHub-generated PR data, NOT verified user-facing release notes.\n'
printf 'Rewrite it into docs/releases/%s.md with exact reviewed promotion PR.\n' "$tag"
printf 'Review Highlights, Improvements, Fixes and Known Limitations.\n'
printf 'Draft source: protected kaori/staging (pre-promotion candidate).\n'
printf 'Category preview: GitHub loads .github/release.yml only from default main;\n'
printf 'until that file is promoted, built-in category defaults may be used.\n'
printf 'No GitHub Release, tag, deployment or production approval is triggered.\n\n'
gh api --method POST "repos/$repo/releases/generate-notes" \
  -f tag_name="$tag" -f target_commitish=kaori/staging \
  -f previous_tag_name="$previous" \
  --jq .body
