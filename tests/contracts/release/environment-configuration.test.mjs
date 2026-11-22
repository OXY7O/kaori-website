import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflowPaths = [
  ".github/workflows/quality.yml",
  ".github/workflows/release-production.yml",
  ".github/workflows/publish-staging-image.yml",
  ".github/workflows/deploy-staging-host.yml",
];
const workflows = workflowPaths.map((path) => readFileSync(path, "utf8"));
const developer = readFileSync(".github/workflows/developer-check.yml", "utf8");

test("release workflows resolve configuration in protected runner steps, not at job scheduling", () => {
  for (const yaml of workflows) {
    assert.match(yaml, /environment:\n\s+name:/);
    assert.match(
      yaml,
      /- name: Resolve protected Environment configuration\n[\s\S]*?env:\n\s+KAORI_WEBSITE_DOCKER_REGISTRY_HOST: \$\{\{ vars\.KAORI_WEBSITE_DOCKER_REGISTRY_HOST \}\}/,
    );
    assert.match(
      yaml,
      /KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE: \$\{\{ vars\.KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE \}\}/,
    );
    assert.match(yaml, /scripts\/release\/resolve-environment\.sh/);
    assert.doesNotMatch(yaml, /^\s{6}(REGISTRY_HOST|REGISTRY_IMAGE|WEBSITE_HOST): \$\{\{ vars\./m);
  }
  assert.doesNotMatch(developer, /\$\{\{\s*vars\.KAORI_WEBSITE_/);
  assert.doesNotMatch(developer, /environment:\n\s+name: staging/);
  assert.match(
    developer,
    /node --test tests\/contracts\/release\/environment-configuration\.test\.mjs/,
  );
});

test("source admission never requests production approval or stable release", () => {
  const admission = workflows[0];
  assert.match(admission, /push:\n    branches:\n      - kaori\/staging\n      - main/);
  assert.doesNotMatch(admission, /stable-publication:/);
  assert.doesNotMatch(admission, /name: production\n/);
  assert.doesNotMatch(admission, /KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED/);
  assert.match(admission, /staging-release-activation:/);
  assert.match(admission, /KAORI_WEBSITE_AUTO_STAGING_ENABLED:-/);
  assert.match(admission, /needs\.staging-release-activation\.outputs\.enabled == 'true'/);
  assert.match(
    admission,
    /KAORI_WEBSITE_AUTO_STAGING_ENABLED: \$\{\{ vars\.KAORI_WEBSITE_AUTO_STAGING_ENABLED \}\}/,
  );
});

test("only explicit main dispatch enters protected production release", () => {
  const production = workflows[1];
  assert.match(production, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(production, /\n  push:/);
  assert.match(production, /name: Validate Explicit Release Request/);
  assert.match(production, /name: Release Accepted Artifact to Production/);
  assert.match(production, /name: production\n      url: https:\/\/kaori\.cloud/);
  assert.match(production, /inputs\.stable_tag/);
  assert.doesNotMatch(production, /inputs\\.promotion_pr/);
  assert.match(production, /steps\\.reviewed-notes\\.outputs\\.promotion_pr/);
  assert.match(production, /needs\\.release-request\\.outputs\\.promotion_pr/);
  assert.match(production, /head_sha=\$GITHUB_SHA/);
  assert.match(production, /scripts\/release\/promote-stable\.sh preflight/);
  assert.match(production, /scripts\/release\/promote-stable\.sh publish/);
  assert.doesNotMatch(production, /KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED/);
});

function check(mode, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kaori-env-"));
  const output = join(dir, "env");
  writeFileSync(output, "");
  try {
    const res = spawnSync("bash", ["scripts/release/resolve-environment.sh", mode], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        GITHUB_ENV: output,
        KAORI_WEBSITE_DOCKER_REGISTRY_HOST: "docker.io",
        KAORI_WEBSITE_DOCKER_REGISTRY_IMAGE: "docker.io/oxy7o/kaori-website",
        KAORI_WEBSITE_HOST: "host.example.invalid",
        KAORI_WEBSITE_HOST_PORT: "22",
        KAORI_WEBSITE_HOST_USER: "deploy",
        KAORI_WEBSITE_HOST_DEPLOY_ROOT: "/opt/kaori-website",
        ...overrides,
      },
    });
    return { status: res.status, stderr: res.stderr, data: readFileSync(output, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("deployment maps approved Environment identity and defaults", () => {
  const result = check("deployment");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.data, /^REGISTRY_HOST=docker\.io$/m);
  assert.match(result.data, /^WEBSITE_HOST=host\.example\.invalid$/m);
  assert.match(result.data, /^WEBSITE_COMPOSE_PROJECT=kaori-website$/m);
  assert.match(result.data, /^WEBSITE_LOOPBACK_PORT=18080$/m);
});

test("read-only preflight maps existing DEPLOY alias contract", () => {
  const result = check("preflight");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.data, /^DEPLOY_HOST=host\.example\.invalid$/m);
  assert.match(result.data, /^DEPLOY_ROOT=\/opt\/kaori-website$/m);
});

test("missing deployment host fails closed", () => {
  const result = check("deployment", { KAORI_WEBSITE_HOST: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK:/);
  assert.doesNotMatch(result.data, /WEBSITE_HOST=/);
});

test("multiline Environment value cannot inject runner configuration", () => {
  const result = check("deployment", { KAORI_WEBSITE_COMPOSE_PROJECT: "safe\nINJECTED=true" });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.data, /INJECTED=/);
});
