import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-staging-host.yml", "utf8");
const adapter = readFileSync("scripts/release/deploy-release.sh", "utf8");
const admission = readFileSync(".github/workflows/quality.yml", "utf8");
const publisher = readFileSync("scripts/release/publish-candidate.sh", "utf8");
const deploy = readFileSync("deploy/server/deploy.sh", "utf8");
const sha = "a".repeat(40);
const tag = "v0.1.2-rc.9";
const issue = "195";

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
      PUBLIC_UAT_APPROVED_SHA: sha,
      PUBLIC_UAT_APPROVED_TAG: tag,
      PUBLIC_UAT_APPROVAL_ISSUE: issue,
      APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/" + issue,
      ...overrides,
    },
    timeout: 10000,
  });
}

test("public request route requires release-scoped GitHub authorization", () => {
  assert.match(workflow, /kaori\/uat-request/);
  assert.match(workflow, /vars\.KAORI_WEBSITE_PUBLIC_UAT_APPROVED_SHA/);
  assert.match(workflow, /vars\.KAORI_WEBSITE_PUBLIC_UAT_APPROVED_TAG/);
  assert.match(workflow, /vars\.KAORI_WEBSITE_PUBLIC_UAT_APPROVAL_ISSUE/);
  assert.match(workflow, /public UAT approval SHA missing or stale/);
  assert.match(workflow, /public UAT approval RC tag missing or stale/);
  assert.match(workflow, /public UAT approval issue missing or invalid/);
  assert.match(workflow, /Public UAT authorization: APPROVED/);
  assert.match(workflow, /Source SHA: \$accepted/);
  assert.match(workflow, /RC tag: \$tag/);
  assert.match(workflow, /\[\[ "\$\(jq -r '\.state' <<<"\$issue"\)" == open \]\]/);
  assert.match(
    workflow,
    /approval="https:\/\/github\.com\/\$GITHUB_REPOSITORY\/issues\/\$PUBLIC_UAT_APPROVAL_ISSUE"/,
  );
  assert.match(workflow, /edge=1/);
  assert.doesNotMatch(
    workflow,
    /approval="https:\/\/github\.com\/\$GITHUB_REPOSITORY\/pull\/\$number"\s*edge=1/,
  );
});

test("branch request blocks unapproved and stale public cutover before SSH", () => {
  const cases = [
    {
      name: "no public edge",
      overrides: { KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0" },
      error: "public UAT request requires explicit approved existing-edge attachment",
    },
    {
      name: "missing SHA",
      overrides: { PUBLIC_UAT_APPROVED_SHA: "" },
      error: "public UAT request approval SHA missing or stale",
    },
    {
      name: "stale SHA",
      overrides: { PUBLIC_UAT_APPROVED_SHA: "b".repeat(40) },
      error: "public UAT request approval SHA missing or stale",
    },
    {
      name: "wrong RC",
      overrides: { PUBLIC_UAT_APPROVED_TAG: "v0.1.2-rc.8" },
      error: "public UAT request approval tag missing or stale",
    },
    {
      name: "missing issue",
      overrides: { PUBLIC_UAT_APPROVAL_ISSUE: "" },
      error: "public UAT request approval issue missing",
    },
    {
      name: "wrong reference",
      overrides: { APPROVAL_REF: "https://github.com/OXY7O/kaori-website/pull/193" },
      error: "public UAT request approval reference mismatch",
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

test("admitted protected staging is the only automatic signing trigger", () => {
  assert.match(admission, /staging-rc-publish:/);
  assert.match(admission, /staging-rc-deploy:/);
  assert.match(admission, /needs: \[promotion-source, full-admission, container-admission, browser-evidence\]/);
  assert.match(admission, /KAORI_WEBSITE_AUTO_STAGING_ENABLED == 'true'/);
  assert.match(admission, /environment:\n      name: staging/);
  assert.match(admission, /group: kaori-website-release-deploy/);
  assert.match(admission, /scripts\/release\/publish-candidate\.sh resolve/);
  assert.match(admission, /scripts\/release\/deploy-release\.sh deploy/);
  assert.match(publisher, /mode" == resolve/);
  assert.match(publisher, /automatic RC requires canonical Full Admission workflow identity/);
  assert.match(publisher, /same-source published prerelease identity differs/);
  assert.match(adapter, /staging auto-deploy requires existing single public edge/);
  assert.match(adapter, /staging auto-deploy authority must match approved workstream/);
});

test("automatic staging adapter rejects wrong provenance before SSH", () => {
  const result = spawnSync("bash", [resolve("scripts/release/deploy-release.sh"), "preflight"], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF: "refs/heads/kaori/staging",
      KAORI_WEBSITE_STAGING_AUTO: "1",
      GITHUB_REPOSITORY: "OXY7O/kaori-website",
      GITHUB_WORKFLOW_REF: "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/kaori/staging",
      KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0",
      APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/202",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK: staging auto-deploy requires existing single public edge/);
});
