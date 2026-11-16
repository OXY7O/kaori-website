import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-staging-host.yml", "utf8");
const adapter = readFileSync("scripts/release/deploy-release.sh", "utf8");
const deploy = readFileSync("deploy/server/deploy.sh", "utf8");
const sha = "a".repeat(40);
const tag = "v0.1.2-rc.9";

const approvalFilter = workflow.match(
  /page_matches="\$\(jq -c --arg sha "\$accepted" --arg tag "\$tag" '([\s\S]*?)' <<<"\$issues"\)"/,
)?.[1];

function matches(items) {
  assert.ok(approvalFilter);
  const result = spawnSync(
    "jq",
    ["-c", "--arg", "sha", sha, "--arg", "tag", tag, approvalFilter],
    { encoding: "utf8", input: JSON.stringify(items) },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

function issue(overrides = {}) {
  return {
    number: 198,
    state: "open",
    title: "ops(release): approved Website public UAT",
    author_association: "MEMBER",
    labels: [{ name: "area:platform" }],
    body: [
      "Public UAT authorization: APPROVED",
      "Source SHA: " + sha,
      "RC tag: " + tag,
    ].join("\n"),
    ...overrides,
  };
}

function preflight(overrides = {}) {
  return spawnSync("bash", [resolve("scripts/release/deploy-release.sh"), "preflight"], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF: "refs/heads/kaori/uat-request",
      KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "1",
      ACCEPTED_SHA: sha,
      RC_TAG: tag,
      APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/198",
      ...overrides,
    },
    timeout: 10000,
  });
}

test("public UAT reuses existing environment and one approved issue", () => {
  assert.match(workflow, /environment: uat/);
  assert.match(workflow, /issues: read/);
  assert.match(workflow, /Public UAT authorization: APPROVED/);
  assert.match(workflow, /expected exactly one trusted open public UAT release approval issue/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_SHA/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_TAG/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVAL_ISSUE/);
});

test("exact signed SHA and tag accept one trusted open release issue", () => {
  assert.deepEqual(matches([issue()]), [198]);
  assert.deepEqual(matches([issue({ author_association: "OWNER" })]), [198]);
  assert.deepEqual(matches([issue({ author_association: "COLLABORATOR" })]), [198]);
});

test("untrusted, stale and ambiguous approval issues block release", () => {
  const bad = [
    issue({ state: "closed" }),
    issue({ author_association: "NONE" }),
    issue({ labels: [] }),
    issue({ title: "misc: request" }),
    issue({ pull_request: {} }),
    issue({ body: "Public UAT authorization: PENDING" }),
    issue({ body: "Source SHA: " + "b".repeat(40) }),
  ];
  for (const candidate of bad) {
    assert.deepEqual(matches([candidate]), []);
  }
  assert.deepEqual(matches([]), []);
  assert.deepEqual(matches([issue(), issue({ number: 199 })]), [198, 199]);
});

test("adapter rejects invalid push requests before SSH", () => {
  const invalid = [
    { GITHUB_REF: "refs/heads/feature/other" },
    { KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0" },
    { APPROVAL_REF: "" },
    { APPROVAL_REF: "https://github.com/OXY7O/kaori-website/pull/197" },
  ];
  for (const overrides of invalid) {
    const result = preflight(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BLOCK:/);
    assert.doesNotMatch(result.stdout, /Accepted RC|Release container deployed/);
  }
});

test("approved request retains the public slot, rollback and manual path", () => {
  assert.match(adapter, /runtime_env=production/);
  assert.match(adapter, /remote_state_dir=\/var\/lib\/kaori-website\/deploy-state/);
  assert.match(adapter, /reattach-existing-site\.sh" preflight/);
  assert.match(adapter, /reattach-existing-site\.sh" attach/);
  assert.match(adapter, /export KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1/);
  assert.match(deploy, /previous-release\.env/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /candidate_tag:/);
  assert.match(workflow, /approval_reference:/);
  assert.match(workflow, /publish_existing_edge:/);
  assert.match(workflow, /edge="\$REQUEST_PUBLIC_EDGE"/);
  assert.match(adapter, /GITHUB_EVENT_NAME" == workflow_dispatch/);
});
