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
const issueUrl = "https://github.com/OXY7O/kaori-website/issues/198";

const approvalFilter = workflow.match(
  /page_matches="\$\(jq -c --arg sha "\$accepted" --arg tag "\$tag" '([\s\S]*?)' <<<"\$issues"\)"/,
)?.[1];

function resolveIssues(issues) {
  assert.ok(approvalFilter, "canonical workflow must expose an exact approval filter");
  const result = spawnSync(
    "jq",
    ["-c", "--arg", "sha", sha, "--arg", "tag", tag, approvalFilter],
    { input: JSON.stringify(issues), encoding: "utf8", timeout: 10000 },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

function approvedIssue(overrides = {}) {
  return {
    number: 198,
    title: "ops(release): approved Website public UAT",
    state: "open",
    author_association: "MEMBER",
    labels: [{ name: "area:platform" }],
    user: { login: "lethisa" },
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
      APPROVAL_REF: issueUrl,
      ...overrides,
    },
    timeout: 10000,
  });
}

test("website reuses uat environment without per-release variable duplication", () => {
  assert.match(workflow, /kaori\/uat-request/);
  assert.match(workflow, /environment: uat/);
  assert.match(workflow, /issues: read/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_SHA/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_TAG/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVAL_ISSUE/);
  assert.match(workflow, /Public UAT authorization: APPROVED/);
  assert.match(workflow, /expected exactly one trusted open public UAT release approval issue/);
  assert.match(workflow, /public UAT approval issue discovery failed/);
  assert.match(workflow, /public UAT approval list exceeds bounded pages/);
  assert.match(workflow, /approval="https:\/\/github\.com\/\$GITHUB_REPOSITORY\/issues\/\$approved_number"/);
  assert.match(workflow, /edge=1/);
});

test("one trusted open exact SHA and tag release issue authorizes public UAT", () => {
  assert.deepEqual(resolveIssues([approvedIssue()]), [198]);
  assert.deepEqual(
    resolveIssues([approvedIssue({ author_association: "OWNER" })]),
    [198],
  );
  assert.deepEqual(
    resolveIssues([approvedIssue({ author_association: "COLLABORATOR" })]),
    [198],
  );
});

test("stale, missing and untrusted public approval issues are not accepted", () => {
  const cases = [
    ["missing issue", []],
    ["closed", [approvedIssue({ state: "closed" })]],
    ["PR, not issue", [approvedIssue({ pull_request: { url: "https://api.github.com/pulls/198" } })]],
    ["untrusted author", [approvedIssue({ author_association: "NONE" })]],
    ["wrong area label", [approvedIssue({ labels: [{ name: "documentation" }] })]],
    ["wrong issue type", [approvedIssue({ title: "misc: unreviewed request" })]],
    ["stale source SHA", [approvedIssue({ body: "Public UAT authorization: APPROVED\nSource SHA: " + "b".repeat(40) + "\nRC tag: " + tag })]],
    ["wrong signed tag", [approvedIssue({ body: "Public UAT authorization: APPROVED\nSource SHA: " + sha + "\nRC tag: v0.1.2-rc.8" })]],
    ["no approval", [approvedIssue({ body: "Public UAT authorization: PENDING\nSource SHA: " + sha + "\nRC tag: " + tag })]],
    ["only quoted approval", [approvedIssue({ body: "> Public UAT authorization: APPROVED\nSource SHA: " + sha + "\nRC tag: " + tag })]],
    ["ambiguous duplicate", [approvedIssue(), approvedIssue({ number: 199 })]],
  ];
  for (const [name, issues] of cases) {
    const results = resolveIssues(issues);
    if (name === "ambiguous duplicate") {
      assert.notEqual(results.length, 1, name);
    } else {
      assert.deepEqual(results, [], name);
    }
  }
});

test("push adapter blocks wrong branch, no public edge and invalid issue reference before SSH", () => {
  const cases = [
    ["wrong branch", { GITHUB_REF: "refs/heads/feature/other" }, "push UAT request must use kaori/uat-request"],
    ["no edge", { KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0" }, "public UAT request requires explicit approved existing-edge attachment"],
    ["missing issue", { APPROVAL_REF: "" }, "public UAT request requires exact approved issue reference"],
    ["PR approval", { APPROVAL_REF: "https://github.com/OXY7O/kaori-website/pull/197" }, "public UAT request requires exact approved issue reference"],
    ["cross-repo issue", { APPROVAL_REF: "https://github.com/OXY7O/KAORI/issues/198" }, "public UAT request requires exact approved issue reference"],
  ];
  for (const [name, overrides, error] of cases) {
    const result = preflight(overrides);
    assert.notEqual(result.status, 0, name);
    assert.ok(result.stderr.includes("BLOCK: " + error), name);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /Accepted RC|ssh-agent|Release container deployed/,
      name,
    );
  }
});

test("approved public request preserves existing single-slot and rollback contracts", () => {
  assert.match(
    adapter,
    /runtime_env=production\nremote_release="\$WEBSITE_DEPLOY_ROOT\/releases\/\$ACCEPTED_SHA"/,
  );
  assert.match(adapter, /remote_state_dir=\/var\/lib\/kaori-website\/deploy-state/);
  assert.match(adapter, /reattach-existing-site\.sh" preflight/);
  assert.match(adapter, /reattach-existing-site\.sh" attach/);
  assert.match(adapter, /export KAORI_WEBSITE_RELEASE_LOCAL_ONLY=1/);
  assert.match(adapter, /if \[\[ "\$attach_existing_edge" == 1 \]\]/);
  assert.match(deploy, /previous-release\.env/);
  assert.doesNotMatch(
    adapter,
    /if \[\[ "\$GITHUB_EVENT_NAME" == push \]\]; then\s+runtime_env=uat/,
  );
});

test("manual deployment inputs and explicit staging authority remain unchanged", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /candidate_tag:/);
  assert.match(workflow, /approval_reference:/);
  assert.match(workflow, /publish_existing_edge:/);
  assert.match(workflow, /\[\[ "\$GITHUB_REF" == refs\/heads\/kaori\/staging \]\]/);
  assert.match(workflow, /edge="\$REQUEST_PUBLIC_EDGE"/);
  assert.match(adapter, /GITHUB_EVENT_NAME" == workflow_dispatch/);
});
