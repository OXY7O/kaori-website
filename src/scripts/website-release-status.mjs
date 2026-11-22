// The signed OCI build identity is immutable. Stable status may arrive only
// through the same-origin receipt published by the protected production release.
const semver = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
const candidate = /^(v[0-9]+\.[0-9]+\.[0-9]+)-rc\.[1-9][0-9]*$/;
const sha = /^[a-f0-9]{40}$/;
const digest = /^sha256:[a-f0-9]{64}$/;

export function verifiedWebsiteStable(metadata, active, currentBuild, currentSource) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  if (!active || typeof active !== "object" || Array.isArray(active)) return null;
  if (metadata.schema !== 1 || metadata.status !== "stable") return null;
  if (active.schema !== 1 || active.status !== "active") return null;
  if (typeof currentBuild !== "string" || typeof currentSource !== "string") return null;
  const built = candidate.exec(currentBuild);
  if (!built || !sha.test(currentSource)) return null;
  if (
    !semver.test(metadata.stable_tag) ||
    !candidate.test(metadata.build_tag) ||
    metadata.stable_tag !== built[1] ||
    metadata.build_tag !== currentBuild ||
    metadata.source_sha !== currentSource ||
    !digest.test(metadata.image_digest) ||
    !sha.test(metadata.main_sha)
  ) {
    return null;
  }
  return metadata.stable_tag;
}
