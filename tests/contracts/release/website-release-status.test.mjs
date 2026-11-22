import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { verifiedWebsiteStable } from "../../../src/scripts/website-release-status.mjs";

const source = "a".repeat(40);
const main = "c".repeat(40);
const digest = "sha256:" + "b".repeat(64);
const otherDigest = "sha256:" + "d".repeat(64);
const build = "v0.1.4-rc.1";
const stable = {
  schema: 1,
  status: "stable",
  stable_tag: "v0.1.4",
  build_tag: build,
  source_sha: source,
  image_digest: digest,
  main_sha: main,
};
const active = {
  schema: 1,
  status: "active",
  build_tag: build,
  source_sha: source,
  image_digest: digest,
};

test("signed RC build has no stable status until independently committed stable receipt", () => {
  assert.equal(verifiedWebsiteStable(null, active, build, source), null);
  assert.equal(verifiedWebsiteStable(stable, null, build, source), null);
  assert.equal(verifiedWebsiteStable({}, active, build, source), null);
  assert.equal(verifiedWebsiteStable(stable, active, "development", source), null);
  assert.equal(verifiedWebsiteStable(stable, active, build, ""), null);
});

test("postpublication stable label requires matching committed active signed digest", () => {
  assert.equal(verifiedWebsiteStable(stable, active, build, source), "v0.1.4");
  assert.equal(
    verifiedWebsiteStable(
      { ...stable, published_at: "2026-11-22T09:00:00Z" },
      active,
      build,
      source,
    ),
    "v0.1.4",
  );
});

test("new public candidate and rejected stale metadata cannot claim previous stable", () => {
  assert.equal(
    verifiedWebsiteStable(stable, { ...active, image_digest: otherDigest }, build, source),
    null,
  );
  assert.equal(
    verifiedWebsiteStable(stable, { ...active, build_tag: "v0.1.4-rc.2" }, build, source),
    null,
  );
  assert.equal(
    verifiedWebsiteStable(stable, { ...active, source_sha: "e".repeat(40) }, build, source),
    null,
  );
  assert.equal(verifiedWebsiteStable(stable, active, "v0.1.5-rc.1", source), null);
  assert.equal(verifiedWebsiteStable(stable, active, build, "f".repeat(40)), null);
});

test("rollback or missing/tampered host receipts fail closed", () => {
  const failures = [
    { ...stable, stable_tag: "v0.1.3" },
    { ...stable, status: "candidate" },
    { ...stable, schema: 0 },
    { ...stable, build_tag: "v0.1.3-rc.2" },
    { ...stable, image_digest: "not-a-digest" },
    { ...stable, main_sha: "" },
  ];
  for (const receipt of failures) {
    assert.equal(verifiedWebsiteStable(receipt, active, build, source), null);
  }
  for (const receipt of [
    { ...active, status: "stable" },
    { ...active, schema: 0 },
    { ...active, image_digest: "sha256:" + "0".repeat(64) },
  ]) {
    assert.equal(verifiedWebsiteStable(stable, receipt, build, source), null);
  }
  assert.equal(verifiedWebsiteStable(stable, active, "v0.1.4", source), null);
});

test("stable publisher writes only after trusted GitHub publication and target verification", () => {
  const publisher = readFileSync("scripts/release/promote-stable.sh", "utf8");
  const deployed = readFileSync("deploy/server/deploy.sh", "utf8");
  const verifier = readFileSync("deploy/server/verify.sh", "utf8");
  const compose = readFileSync("deploy/server/compose.website.yml", "utf8");
  const nginx = readFileSync("deploy/server/nginx.conf", "utf8");
  const dockerfile = readFileSync("Dockerfile", "utf8");
  assert.ok(
    publisher.indexOf('[[ "$(api_get "$api/git/ref/tags/$stable_tag"') <
      publisher.indexOf('manifest="$(jq -cn'),
    "verify signed stable Git tag before building public status",
  );
  assert.ok(
    publisher.indexOf('fail \'published stable metadata differs') <
      publisher.indexOf('manifest="$(jq -cn'),
    "verify provider stable release before preparing public status",
  );
  assert.ok(
    publisher.indexOf('manifest="$(jq -cn') <
      publisher.indexOf('mv -f -- "$candidate" "$metadata_dir/release.json"'),
    "stable status is published only after stable source+digest validation",
  );
  assert.match(publisher, /committed active image digest\/source\/build differs/);
  assert.match(publisher, /read-only stable release mount/);
  assert.match(publisher, /public stable metadata readback does not match/);
  assert.match(deployed, /mv -- "\$candidate" "\$state_dir\/release.env"/);
  assert.match(deployed, /mv -- "\$active_candidate" "\$metadata_dir\/active.json"/);
  assert.match(verifier, /CapBnd:\[\[:space:\]\]\+0\+/);
  assert.match(compose, /release-metadata\}:\/usr\/share\/nginx\/html\/\.well-known\/kaori-website:ro/);
  assert.match(nginx, /Cache-Control "no-store" always/);
  assert.match(nginx, /active\|release/);
  assert.match(dockerfile, /PUBLIC_KAORI_WEBSITE_BUILD_SHA=\$\{APP_BUILD_SHA\}/);
});
