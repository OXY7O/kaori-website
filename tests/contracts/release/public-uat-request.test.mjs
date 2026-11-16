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
  assert.match(
    workflow,
    /expected exactly one trusted open public UAT release approval issue/,
  );
  assert.match(workflow, /public UAT approval issue discovery failed/);
  assert.match(workflow, /public UAT approval list exceeds bounded pages/);
  assert.match(
    workflow,
    /approval="https:\/\/github\.com\/\$GITHUB_REPOSITORY\/issues\/\$approved_number"/,
  );
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

function issueBody(
  marker = "Public UAT authorization: APPROVED",
  source = sha,
  version = tag,
) {
  return [marker, "Source SHA: " + source, "RC tag: " + version].join("\n");
}

test("stale, missing and untrusted public approval issues are rejected", () => {
  const cases = [
    { name: "missing issue", issues: [] },
    { name: "closed", issues: [approvedIssue({ state: "closed" })] },
    {
      name: "PR, not issue",
      issues: [approvedIssue({ pull_request: { url: "https://api.github.com/pulls/198" } })],
    },
    {
      name: "untrusted author",
      issues: [approvedIssue({ author_association: "NONE" })],
    },
    {
      name: "wrong area label",
      issues: [approvedIssue({ labels: [{ name: "documentation" }] })],
    },
    {
      name: "wrong issue type",
      issues: [approvedIssue({ title: "misc: unreviewed request" })],
    },
    {
      name: "stale source SHA",
      issues: [approvedIssue({ body: issueBody(undefined, "b".repeat(40)) })],
    },
    {
      name: "wrong signed tag",
      issues: [approvedIssue({ body: issueBody(undefined, sha, "v0.1.2-rc.8") })],
    },
    {
      name: "no approval",
      issues: [
        approvedIssue({
          body: issueBody("Public UAT authorization: PENDING"),
        }),
      ],
    },
    {
      name: "only quoted approval",
      issues: [
        approvedIssue({
          body: issueBody("> Public UAT authorization: APPROVED"),
        }),
      ],
    },
    {
      name: "ambiguous duplicate",
      issues: [approvedIssue(), approvedIssue({ number: 199 })],
    },
  ];

  for (const { name, issues } of cases) {
    const matches = resolveIssues(issues);
    if (name === "ambiguous duplicate") {
      assert.notEqual(matches.length, 1, name);
    } else {
      assert.deepEqual(matches, [], name);
    }
  }
});

test("push adapter rejects unauthorized requests before SSH", () => {
  const cases = [
    {
      name: "wrong branch",
      overrides: { GITHUB_REF: "refs/heads/feature/other" },
      error: "push UAT request must use kaori/uat-request",
    },
    {
      name: "no edge",
      overrides: { KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0" },
      error: "public UAT request requires explicit approved existing-edge attachment",
    },
    {
      name: "missing issue",
      overrides: { APPROVAL_REF: "" },
      error: "public UAT request requires exact approved issue reference",
    },
    {
      name: "PR approval",
      overrides: {
        APPROVAL_REF: "https://github.com/OXY7O/kaori-website/pull/197",
      },
      error: "public UAT request requires exact approved issue reference",
    },
    {
      name: "cross-repo issue",
      overrides: {
        APPROVAL_REF: "https://github.com/OXY7O/KAORI/issues/198",
      },
      error: "public UAT request requires exact approved issue reference",
    },
  ];

  for (const { name, overrides, error } of cases) {
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

test("approved request preserves existing public slot and rollback", () => {
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
