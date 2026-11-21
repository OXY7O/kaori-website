import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(".github/workflows/deploy-staging-host.yml", "utf8");
const environmentConfig = readFileSync("scripts/release/resolve-environment.sh", "utf8");
const candidateWorkflow = readFileSync(".github/workflows/publish-staging-image.yml", "utf8");
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

test("production deployment adapter is guarded by protected main identity", () => {
  const approved = "https://github.com/OXY7O/kaori-website/pull/235";
  const cases = [
    [
      {
        GITHUB_REF: "refs/heads/main",
        GITHUB_WORKFLOW_REF:
          "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/kaori/staging",
        APPROVAL_REF: approved,
      },
      "production deployment must originate from canonical protected main workflow",
    ],
    [
      {
        GITHUB_REF: "refs/heads/main",
        GITHUB_WORKFLOW_REF: "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/main",
        APPROVAL_REF: "",
      },
      "production deploy requires reviewed promotion PR authority",
    ],
    [
      {
        GITHUB_REF: "refs/heads/main",
        GITHUB_WORKFLOW_REF: "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/main",
        APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/235",
      },
      "production deploy requires reviewed promotion PR authority",
    ],
  ];
  for (const [overrides, message] of cases) {
    const result = preflight(overrides);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes("BLOCK: " + message), result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /Accepted RC|ssh-agent|docker login/);
  }
  assert.match(adapter, /git merge-base --is-ancestor "\$ACCEPTED_SHA" HEAD/);
  assert.match(adapter, /production runtime inputs drifted since accepted RC/);
  assert.match(adapter, /main changed since protected production approval/);
});

test("manual RC and UAT fallbacks require the protected staging Environment", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment:\n      name: staging/);
  assert.match(candidateWorkflow, /workflow_dispatch:/);
  assert.match(candidateWorkflow, /environment:\n      name: staging/);
  assert.match(workflow, /manual UAT requires protected staging and staging Environment/);
  assert.match(candidateWorkflow, /manual RC requires protected staging and staging Environment/);
  assert.doesNotMatch(workflow, /kaori\/uat-request/);
  assert.doesNotMatch(candidateWorkflow, /kaori\/rc-request/);
  assert.doesNotMatch(workflow, /PUBLIC_UAT_APPROVED_SHA|PUBLIC_UAT_APPROVED_TAG/);
  assert.match(workflow, /scripts\/release\/resolve-environment\.sh deployment/);
  assert.match(environmentConfig, /put WEBSITE_COMPOSE_PROJECT/);
  assert.match(environmentConfig, /put WEBSITE_STATE_DIR/);
  assert.match(environmentConfig, /put WEBSITE_LOOPBACK_PORT/);
  assert.match(workflow, /group: kaori-website-release-deploy/);
  assert.match(candidateWorkflow, /group: kaori-website-rc/);
  assert.match(workflow, /approval_reference:/);
});

test("retired request-branch push rejects before SSH or Docker mutation", () => {
  for (const ref of ["refs/heads/kaori/uat-request", "refs/heads/feature/other"]) {
    const result = preflight({ GITHUB_REF: ref });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BLOCK: unsupported UAT request event/);
    assert.doesNotMatch(result.stdout + result.stderr, /Accepted RC|ssh-agent|docker login/);
  }
});

test("approved request selects existing single public slot, not parallel UAT", () => {
  assert.match(
    adapter,
    /runtime_env=production\nremote_release="\$WEBSITE_DEPLOY_ROOT\/releases\/\$ACCEPTED_SHA"/,
  );
  assert.match(
    adapter,
    /remote_state_dir="\$\{WEBSITE_STATE_DIR:-\/var\/lib\/kaori-website\/deploy-state\}"/,
  );
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
  assert.match(workflow, /manual UAT requires protected staging and staging Environment/);
  assert.match(workflow, /edge="\$REQUEST_PUBLIC_EDGE"/);
  assert.match(adapter, /GITHUB_EVENT_NAME" == workflow_dispatch/);
});

test("admitted protected staging is the only automatic signing trigger", () => {
  assert.match(admission, /staging-rc-publish:/);
  assert.match(admission, /staging-rc-deploy:/);
  assert.match(
    admission,
    /needs: \[promotion-source, full-admission, container-admission, browser-evidence\]/,
  );
  assert.match(admission, /KAORI_WEBSITE_AUTO_STAGING_ENABLED:-/);
  assert.match(admission, /environment:\n      name: staging/);
  assert.match(admission, /group: kaori-website-release-deploy/);
  assert.match(admission, /Select unique signed candidate or verify existing release/);
  assert.match(admission, /scripts\/release\/deploy-release\.sh deploy/);
  assert.match(admission, /should_publish=true/);
  assert.match(
    publisher,
    /automatic staging RC requires canonical Full Admission workflow identity/,
  );
  assert.match(admission, /existing RC source mismatch/);
  assert.match(adapter, /staging auto-deploy requires existing single public edge/);
  assert.match(adapter, /staging auto-deploy authority must match approved workstream/);
});

test("canonical staging deploy receives operator-configured runtime identity", () => {
  assert.match(admission, /name: staging\n      url: https:\/\/kaori\.cloud/);
  assert.match(admission, /scripts\/release\/resolve-environment\.sh deployment/);
  assert.match(environmentConfig, /put WEBSITE_COMPOSE_PROJECT/);
  assert.match(environmentConfig, /put WEBSITE_STATE_DIR/);
  assert.match(environmentConfig, /put WEBSITE_LOOPBACK_PORT/);
  assert.match(adapter, /runtime_project="\$\{WEBSITE_COMPOSE_PROJECT:-kaori-website\}"/);
  assert.match(
    adapter,
    /remote_state_dir="\$\{WEBSITE_STATE_DIR:-\/var\/lib\/kaori-website\/deploy-state\}"/,
  );
  assert.match(adapter, /runtime_loopback="\$\{WEBSITE_LOOPBACK_PORT:-18080\}"/);
  assert.match(adapter, /export COMPOSE_PROJECT_NAME="\$runtime_project"/);
  assert.match(adapter, /export KAORI_WEBSITE_STATE_DIR="\$remote_state_dir"/);
  assert.match(adapter, /export KAORI_WEBSITE_LOOPBACK_PORT="\$runtime_loopback"/);
  assert.doesNotMatch(adapter, /DEPLOYMENT_TOPOLOGY|SPLIT_HOST_ENABLED/);
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
      GITHUB_WORKFLOW_REF:
        "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/kaori/staging",
      KAORI_WEBSITE_ATTACH_EXISTING_EDGE: "0",
      APPROVAL_REF: "https://github.com/OXY7O/kaori-website/issues/202",
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK: staging auto-deploy requires existing single public edge/);
});
