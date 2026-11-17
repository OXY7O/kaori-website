import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const fullAdmission = readFileSync(".github/workflows/quality.yml", "utf8");
const publisher = readFileSync("scripts/release/promote-stable.sh", "utf8");

function rejectPreflight(overrides = {}) {
  return spawnSync("bash", [resolve("scripts/release/promote-stable.sh"), "preflight"], {
    encoding: "utf8",
    timeout: 10000,
    env: {
      ...process.env,
      GH_TOKEN: "test-token",
      GITHUB_SHA: "a".repeat(40),
      GITHUB_REF: "refs/heads/main",
      GITHUB_REPOSITORY: "OXY7O/kaori-website",
      GITHUB_EVENT_NAME: "push",
      GITHUB_WORKFLOW_REF: "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/main",
      GITHUB_RUN_ID: "123",
      REGISTRY_HOST: "docker.io",
      REGISTRY_IMAGE: "docker.io/example/kaori-website",
      ...overrides,
    },
  });
}

test("only main with a production environment may publish same-digest stable", () => {
  assert.match(fullAdmission, /name: Publish Human Accepted Stable Release/);
  assert.match(fullAdmission, /name: production\n      url: https:\/\/kaori\.cloud/);
  assert.match(fullAdmission, /KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED == 'true'/);
  assert.match(fullAdmission, /group: kaori-website-release-deploy/);
  assert.match(
    fullAdmission,
    /needs: \[promotion-source, full-admission, container-admission, browser-evidence\]/,
  );
  assert.match(fullAdmission, /scripts\/release\/promote-stable\.sh preflight/);
  assert.match(fullAdmission, /scripts\/release\/promote-stable\.sh publish/);
  assert.doesNotMatch(fullAdmission, /KAORI_WEBSITE_STABLE_RELEASE_94/);
});

test("publication depends on merged staging promotion, trusted Human UAT and immutable RC identity", () => {
  for (const marker of [
    "api/commits/$GITHUB_SHA/pulls",
    "current-head independent promotion reviewer approval missing",
    "Human UAT evidence:",
    "KAORI_WEBSITE_UAT_ACCEPTED:",
    "collaborators/$approver/permission",
    "Human UAT evidence was edited after promotion merge",
    "previous immutable rollback receipt missing",
    "previous immutable rollback digest evidence invalid",
    "git merge-base --is-ancestor",
    "git diff --quiet",
    "Trivy security and signed SBOM/provenance: PASS",
    "cosign/cosign:v3.1.3 verify",
    '--type "$kind"',
    "KAORI_WEBSITE_IMAGE=$expected_image",
    "KAORI_WEBSITE_SOURCE_SHA=$expected_sha",
    "KAORI_WEBSITE_VERSION=$expected_rc",
    "edge-public",
    "deploy-state/release.env",
  ]) {
    assert.ok(publisher.includes(marker), marker);
  }
  assert.doesNotMatch(publisher, /docker build|docker push|docker compose up/);
  assert.doesNotMatch(publisher, /KAORI_WEBSITE_STABLE_RELEASE_94|ACCEPTED_DIGEST/);
});

test("production promotion uses latest reviewer state for the exact accepted source", () => {
  const filter = publisher.match(
    /jq -e --arg author "\$author" --arg sha "\$rc_sha" '([\s\S]*?)' <<<"\$reviews"/,
  )?.[1];
  assert.ok(filter, "expected current-head review validation");
  const evaluate = (reviews) => {
    const result = spawnSync(
      "jq",
      ["-c", "--arg", "author", "maintainer", "--arg", "sha", "a".repeat(40), filter],
      { input: JSON.stringify(reviews), encoding: "utf8" },
    );
    assert.ok([0, 1].includes(result.status), result.stderr);
    assert.equal(result.stderr, "");
    return JSON.parse(result.stdout);
  };
  const review = (login, state, sha = "a".repeat(40)) => ({
    user: { login },
    state,
    commit_id: sha,
  });
  assert.equal(evaluate([review("reviewer", "APPROVED")]), true);
  assert.equal(evaluate([review("maintainer", "APPROVED")]), false);
  assert.equal(evaluate([review("reviewer", "APPROVED", "b".repeat(40))]), false);
  assert.equal(evaluate([review("reviewer", "APPROVED"), review("reviewer", "DISMISSED")]), false);
});

test("invalid production workflow identity fails before API, SSH and release mutation", () => {
  const cases = [
    [{ GITHUB_REF: "refs/heads/kaori/staging" }, "only main push can publish stable"],
    [{ GITHUB_EVENT_NAME: "workflow_dispatch" }, "only main push can publish stable"],
    [{ GITHUB_REPOSITORY: "OXY7O/KAORI" }, "only main push can publish stable"],
    [
      {
        GITHUB_WORKFLOW_REF:
          "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/kaori/staging",
      },
      "canonical main Full Admission workflow identity required",
    ],
    [
      { REGISTRY_IMAGE: "docker.io/example/kaori-app" },
      "dedicated Website image authority missing",
    ],
  ];
  for (const [overrides, message] of cases) {
    const result = rejectPreflight(overrides);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes("BLOCK: " + message), result.stderr);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /curl|docker run|ssh-agent|stable release published/i,
    );
  }
});
