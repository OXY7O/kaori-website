import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

test("production GET and POST use compatible fail-closed curl flags", () => {
  const calls = publisher.match(/curl --fail-with-body -sS/g) || [];
  assert.equal(calls.length, 2);
  assert.match(publisher, /api_get\(\) \{\s*curl --fail-with-body -sS /);
  assert.match(publisher, /published="\$\(curl --fail-with-body -sS /);
  assert.doesNotMatch(publisher, /curl --fail-with-body -fsS/);
});

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

test("production promotion uses latest reviewer state for the reviewed staging head", () => {
  const filter = publisher.match(
    /jq -e --arg author "\$author" --arg sha "\$promotion_sha" '([\s\S]*?)' <<<"\$reviews"/,
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

test("unadmitted production split host fails closed before any API or SSH", () => {
  assert.match(fullAdmission, /KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY:/);
  assert.match(fullAdmission, /KAORI_WEBSITE_SPLIT_HOST_ENABLED:/);
  assert.match(fullAdmission, /WEBSITE_STAGING_HOST:/);
  const cases = [
    [
      {
        KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY: "invalid",
        KAORI_WEBSITE_SPLIT_HOST_ENABLED: "false",
      },
      "unsupported Website deployment topology",
    ],
    [
      {
        KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY: "single-slot",
        KAORI_WEBSITE_SPLIT_HOST_ENABLED: "true",
      },
      "split-host activation conflicts with approved single-slot topology",
    ],
    [
      {
        KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY: "separate-host",
        KAORI_WEBSITE_SPLIT_HOST_ENABLED: "false",
      },
      "separate-host topology requires explicit production activation",
    ],
    [
      {
        KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY: "separate-host",
        KAORI_WEBSITE_SPLIT_HOST_ENABLED: "true",
        WEBSITE_HOST: "same.internal",
        WEBSITE_STAGING_HOST: "same.internal",
      },
      "separate-host production target must differ from staging host",
    ],
    [
      {
        KAORI_WEBSITE_DEPLOYMENT_TOPOLOGY: "separate-host",
        KAORI_WEBSITE_SPLIT_HOST_ENABLED: "true",
        WEBSITE_HOST: "production.internal",
        WEBSITE_STAGING_HOST: "staging.internal",
      },
      "separate-host stable deployment is not admitted",
    ],
  ];
  for (const [overrides, message] of cases) {
    const result = rejectPreflight(overrides);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes("BLOCK: " + message), result.stderr);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /curl|ssh-agent|docker run|stable release published/i,
    );
  }
});

test("stable lineage binds Human UAT to an ancestor, not to subsequent source-only staging HEAD", () => {
  assert.match(publisher, /promotion_sha="\$\(jq -r '\.\[0\]\.head\.sha'/);
  assert.match(publisher, /--arg sha "\$promotion_sha"/);
  assert.match(publisher, /git merge-base --is-ancestor "\$promotion_sha" HEAD/);
  assert.match(publisher, /git merge-base --is-ancestor "\$accepted_sha" "\$promotion_sha"/);
  assert.match(publisher, /git merge-base --is-ancestor "\$accepted_sha" HEAD/);
  assert.match(publisher, /git diff --quiet "\$accepted_sha" HEAD -- "\$path"/);
  assert.match(publisher, /rc_sha="\$accepted_sha"/);
  assert.doesNotMatch(publisher, /\[\[ "\$accepted_sha" == "\$rc_sha" \]\]/);
  assert.ok(
    publisher.indexOf('git merge-base --is-ancestor "$accepted_sha" "$promotion_sha"') <
      publisher.indexOf('rc_sha="$accepted_sha"'),
    "source lineage must be validated before any signed RC release lookup",
  );
});

test("git ancestry and shipped-input drift fail closed for prior accepted RC", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "kaori-accepted-rc-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    spawnSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      timeout: 10000,
    });
  const ok = (...args) => {
    const result = git(...args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };

  ok("init", "-q");
  ok("config", "user.name", "KAORI Release Test");
  ok("config", "user.email", "test@example.invalid");
  mkdirSync(join(dir, "src"));
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "src", "index.txt"), "accepted release bytes\n");
  writeFileSync(join(dir, "docs", "CI_CD.md"), "pre-release notes\n");
  ok("add", ".");
  ok("commit", "-qm", "signed RC source");
  const accepted = ok("rev-parse", "HEAD");

  writeFileSync(join(dir, "docs", "CI_CD.md"), "updated release runbook\n");
  ok("add", ".");
  ok("commit", "-qm", "source-only governance update");
  const promotion = ok("rev-parse", "HEAD");
  assert.equal(git("merge-base", "--is-ancestor", accepted, promotion).status, 0);
  assert.equal(git("diff", "--quiet", accepted, promotion, "--", "src").status, 0);

  writeFileSync(join(dir, "src", "index.txt"), "changed public bytes\n");
  ok("add", ".");
  ok("commit", "-qm", "changed runtime build input");
  const drifted = ok("rev-parse", "HEAD");
  assert.equal(git("diff", "--quiet", accepted, drifted, "--", "src").status, 1);

  ok("checkout", "--quiet", "--detach", accepted);
  writeFileSync(join(dir, "src", "index.txt"), "unrelated candidate\n");
  ok("add", ".");
  ok("commit", "-qm", "unrelated signed source");
  const unrelated = ok("rev-parse", "HEAD");
  assert.equal(git("merge-base", "--is-ancestor", unrelated, promotion).status, 1);
});
