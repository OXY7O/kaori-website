import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflowPaths = [
  ".github/workflows/quality.yml",
  ".github/workflows/publish-staging-image.yml",
  ".github/workflows/deploy-staging-host.yml",
  ".github/workflows/environment-credential-preflight.yml",
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

test("activation comes from protected Environment and fails closed when absent", () => {
  const yaml = workflows[0];
  assert.match(yaml, /staging-release-activation:/);
  assert.match(yaml, /KAORI_WEBSITE_AUTO_STAGING_ENABLED:-/);
  assert.match(yaml, /needs\.staging-release-activation\.outputs\.enabled == 'true'/);
  assert.match(yaml, /KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED:-/);
  assert.match(
    yaml,
    /KAORI_WEBSITE_AUTO_STAGING_ENABLED: \$\{\{ vars\.KAORI_WEBSITE_AUTO_STAGING_ENABLED \}\}/,
  );
  assert.match(
    yaml,
    /KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED: \$\{\{ vars\.KAORI_WEBSITE_AUTO_PRODUCTION_ENABLED \}\}/,
  );
  assert.match(yaml, /steps\.activation\.outputs\.enabled == 'true'/);
  assert.match(yaml, /name: production\n\s+url: https:\/\/kaori\.cloud/);
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
