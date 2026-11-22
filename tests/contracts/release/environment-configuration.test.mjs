import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  assert.doesNotMatch(production, /inputs\.promotion_pr/);
  assert.match(production, /steps\.reviewed-notes\.outputs\.promotion_pr/);
  assert.match(production, /needs\.release-request\.outputs\.promotion_pr/);
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

test("Docker build context allows only the static Website inputs", () => {
  const rules = readFileSync(".dockerignore", "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  assert.deepEqual(rules, [
    "**",
    "!Dockerfile",
    "!.dockerignore",
    "!package.json",
    "!package-lock.json",
    "!astro.config.mjs",
    "!tsconfig.json",
    "!.prettierrc.json",
    "!src/",
    "!src/**",
    "!public/",
    "!public/**",
    "!deploy/",
    "!deploy/server/",
    "!deploy/server/nginx.conf",
  ]);
  const dockerfile = readFileSync("Dockerfile", "utf8");
  assert.doesNotMatch(dockerfile, /^COPY\s+\.(?:\/|\s)/m);
  assert.match(dockerfile, /COPY --from=build \/build\/dist\/ \/usr\/share\/nginx\/html\//);
  assert.match(dockerfile, /COPY deploy\/server\/nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
});

test("shared production/UAT Compose runtime uses zero-capability non-root isolation", () => {
  const compose = readFileSync("deploy/server/compose.website.yml", "utf8");
  assert.match(compose, /user: "101:101"/);
  assert.match(compose, /cap_drop:\n\s+- ALL/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /\/tmp:rw,noexec,nosuid,size=64m/);
  assert.match(compose, /pids_limit: 100/);
  assert.match(compose, /internal: true/);
  assert.doesNotMatch(compose, /privileged:\s*true|network_mode:\s*host|pid:\s*host/);
});

function manualRcSelectionScript() {
  const workflow = readFileSync(".github/workflows/publish-staging-image.yml", "utf8");
  const start = "      - name: Resolve exact admitted RC request\n";
  const end = "      - name: Verify admitted source and registry configuration\n";
  assert.equal(workflow.split(start).length, 2, "manual RC selector not unique");
  const section = workflow.split(start)[1].split(end)[0];
  const fragments = section.split("        run: |\n");
  assert.equal(fragments.length, 2, "manual RC selector must use a single bash script");
  const lines = fragments[1].split("\n");
  assert.ok(
    lines.every((line) => !line.trim() || line.startsWith("          ")),
    "expected GitHub run script indentation",
  );
  return lines.map((line) => (line.startsWith("          ") ? line.slice(10) : line)).join("\n");
}

test("manual RC workflow shell parses and remains explicitly staging-only", () => {
  const source = manualRcSelectionScript();
  const parsed = spawnSync("bash", ["-n"], { input: source, encoding: "utf8" });
  assert.equal(parsed.status, 0, parsed.stderr);
  assert.match(source, /GITHUB_EVENT_NAME.*workflow_dispatch/);
  assert.match(source, /GITHUB_REF.*refs\/heads\/kaori\/staging/);
  assert.match(source, /should_publish=false/);
  assert.match(source, /should_publish=true/);
  assert.match(source, /git\/ref\/tags\/\$tag/);
  const workflow = readFileSync(".github/workflows/publish-staging-image.yml", "utf8");
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.match(workflow, /environment:\n\s+name: staging/);
  assert.doesNotMatch(workflow, /deploy-release\.sh|name: production/);
});

function manualRcRequest(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kaori-manual-rc-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const git = [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    'if [[ "$1" == rev-parse && "$2" == HEAD ]]; then',
    '  printf "%s\\n" "$MOCK_STAGING_SHA"',
    'elif [[ "$1" == tag && "$2" == --points-at ]]; then',
    '  printf "%s" "$MOCK_SOURCE_TAGS"',
    'elif [[ "$1" == tag && "$2" == --list ]]; then',
    "  if [[ \"$3\" == 'v[0-9]*.[0-9]*.[0-9]*' ]]; then",
    '    printf "v0.1.3\\n"',
    "  else",
    '    printf "%s" "$MOCK_NEXT_TAGS"',
    "  fi",
    "else",
    "  exit 74",
    "fi",
  ].join("\n") + "\n";
  const curl = [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    'for arg in "$@"; do url="$arg"; done',
    'case "$url" in',
    '  */git/ref/heads/kaori/staging)',
    '    printf \'{"object":{"sha":"%s"}}\\n\' "$MOCK_STAGING_SHA" ;;',
    '  */git/ref/tags/*) printf "%s" "$MOCK_TAG_STATUS" ;;',
    '  */releases/tags/*) printf "%s\\n" "$MOCK_RELEASE_JSON" ;;',
    "  *) exit 73 ;;",
    "esac",
  ].join("\n") + "\n";
  writeFileSync(join(bin, "git"), git, { mode: 0o755 });
  writeFileSync(join(bin, "curl"), curl, { mode: 0o755 });
  const output = join(dir, "outputs");
  writeFileSync(output, "");
  const sha = "a".repeat(40);
  const env = {
    ...process.env,
    PATH: bin + ":" + process.env.PATH,
    GITHUB_REPOSITORY: "OXY7O/kaori-website",
    GITHUB_REF: "refs/heads/kaori/staging",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: sha,
    GITHUB_OUTPUT: output,
    GH_TOKEN: "fake-test-token",
    REQUEST_TAG: "v0.1.4-rc.1",
    MOCK_STAGING_SHA: sha,
    MOCK_SOURCE_TAGS: "",
    MOCK_NEXT_TAGS: "",
    MOCK_TAG_STATUS: "404",
    MOCK_RELEASE_JSON: "{}",
    ...overrides,
  };
  const result = spawnSync("bash", ["-e"], {
    input: manualRcSelectionScript(),
    encoding: "utf8",
    env,
  });
  return { ...result, outputs: readFileSync(output, "utf8") };
}

test("exact manual RC request authorizes only the next unused patch candidate", (t) => {
  const accepted = manualRcRequest(t);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.outputs, /^tag=v0\.1\.4-rc\.1$/m);
  assert.match(accepted.outputs, /^should_publish=true$/m);
});

test("manual RC request fails closed on wrong branch, SHA and requested version", (t) => {
  const cases = [
    { GITHUB_REF: "refs/heads/main" },
    { GITHUB_SHA: "b".repeat(40) },
    { REQUEST_TAG: "v0.1.5-rc.1" },
    { REQUEST_TAG: "v0.1.4-rc.2" },
    { REQUEST_TAG: "v0.1.4" },
    { MOCK_TAG_STATUS: "200" },
    { MOCK_TAG_STATUS: "500" },
    { MOCK_NEXT_TAGS: "v0.1.4-rc.1\n" },
    { MOCK_SOURCE_TAGS: "v0.1.4-rc.1\nv0.1.4-rc.2\n" },
    { MOCK_SOURCE_TAGS: "v0.1.4-rc.2\n" },
  ];
  for (const inputs of cases) {
    const result = manualRcRequest(t, inputs);
    assert.notEqual(result.status, 0, JSON.stringify(inputs));
    assert.doesNotMatch(result.outputs, /should_publish=true/);
  }
});

test("existing signed RC is reused only with matching release evidence", (t) => {
  const sha = "a".repeat(40);
  const digest = "b".repeat(64);
  const body = [
    "Staging source SHA: " + sha,
    "Immutable digest: sha256:" + digest,
    "Deployment authority: docker.io/example/kaori-website@sha256:" + digest,
    "Trivy security and signed SBOM/provenance: PASS",
  ].join("\n");
  const validRelease = JSON.stringify({
    prerelease: true,
    target_commitish: sha,
    body,
  });
  const result = manualRcRequest(t, {
    MOCK_SOURCE_TAGS: "v0.1.4-rc.1\n",
    MOCK_RELEASE_JSON: validRelease,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.outputs, /^should_publish=false$/m);
  const invalid = manualRcRequest(t, {
    MOCK_SOURCE_TAGS: "v0.1.4-rc.1\n",
    MOCK_RELEASE_JSON: JSON.stringify({
      prerelease: true,
      target_commitish: sha,
      body: "Release verification: PENDING",
    }),
  });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.outputs, "");
});
