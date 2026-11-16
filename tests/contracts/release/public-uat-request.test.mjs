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
const issue = "198";

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
      APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/" + issue,
      ...overrides,
    },
    timeout: 10000,
  });
}

test("public request route requires a trusted exact release issue", () => {
  assert.match(workflow, /kaori\/uat-request/);
  assert.match(workflow, /environment: uat/);
  assert.match(workflow, /issues: read/);
  assert.match(workflow, /public UAT approval issue discovery failed/);
  assert.match(workflow, /expected exactly one trusted open public UAT release approval issue/);
  assert.match(workflow, /Public UAT authorization: APPROVED/);
  assert.match(workflow, /Source SHA: /);
  assert.match(workflow, /RC tag: /);
  assert.match(
    workflow,
    /approval="https:\/\/github\.com\/\$GITHUB_REPOSITORY\/issues\/\$approved_number"/,
  );
  assert.match(workflow, /edge=1/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_SHA/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVED_TAG/);
  assert.doesNotMatch(workflow + adapter, /PUBLIC_UAT_APPROVAL_ISSUE/);
});

test("branch request blocks unauthorized public cutover before SSH", () => {
  const cases = [
    {
      name: "no public edge",
      overrides: { KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0" },
      error: "public UAT request requires explicit approved existing-edge attachment",
    },
    {
      name: "missing issue",
      overrides: { APPROVAL_REF: "" },
      error: "public UAT request requires exact approved issue reference",
    },
    {
      name: "wrong reference",
      overrides: { APPROVAL_REF: "https://github.com/OXY7O/kaori-website/pull/193" },
      error: "public UAT request requires exact approved issue reference",
    },
    {
      name: "wrong ref",
      overrides: { GITHUB_REF: "refs/heads/feature/other" },
      error: "push UAT request must use kaori/uat-request",
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

test("issue selector rejects stale and untrusted public UAT approvals", () => {
  const filter = workflow.match(
    /page_matches="\$\(jq -c --arg sha "\$accepted" --arg tag "\$tag" '([\s\S]*?)' <<<"\$issues"\)"/,
  )?.[1];
  assert.ok(filter);
  const approved = {
    number: 198,
    title: "ops(release): approved Website public UAT",
    state: "open",
    author_association: "MEMBER",
    labels: [{ name: "area:platform" }],
    body: [
      "Public UAT authorization: APPROVED",
      "Source SHA: " + sha,
      "RC tag: " + tag,
    ].join("\n"),
  };
  const matches = (issues) => {
    const result = spawnSync(
      "jq",
      ["-c", "--arg", "sha", sha, "--arg", "tag", tag, filter],
      { input: JSON.stringify(issues), encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim());
  };
  assert.deepEqual(matches([approved]), [198]);
  assert.deepEqual(matches([]), []);
  assert.deepEqual(matches([{ ...approved, state: "closed" }]), []);
  assert.deepEqual(matches([{ ...approved, author_association: "NONE" }]), []);
  assert.deepEqual(matches([{ ...approved, pull_request: {} }]), []);
  assert.deepEqual(matches([{ ...approved, labels: [] }]), []);
  assert.deepEqual(matches([{ ...approved, body: "RC tag: " + tag }]), []);
  assert.deepEqual(matches([{ ...approved, body: approved.body.replace(sha, "b".repeat(40)) }]), []);
  assert.deepEqual(matches([approved, { ...approved, number: 199 }]), [198, 199]);
});

test("approved request selects existing single public slot, not parallel UAT", () => {
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

test("manual deployment inputs remain explicit and staging-bound", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /candidate_tag:/);
  assert.match(workflow, /approval_reference:/);
  assert.match(workflow, /publish_existing_edge:/);
  assert.match(workflow, /\[\[ "\$GITHUB_REF" == refs\/heads\/kaori\/staging \]\]/);
  assert.match(workflow, /edge="\$REQUEST_PUBLIC_EDGE"/);
  assert.match(adapter, /GITHUB_EVENT_NAME" == workflow_dispatch/);
});
