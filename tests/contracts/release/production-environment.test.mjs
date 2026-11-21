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
    'current_image" == "$expected_image"',
    'current_sha" == "$expected_sha"',
    'current_version" == "$expected_rc"',
    "edge-public",
    'receipt="$runtime_state/release.env"',
  ]) {
    assert.ok(publisher.includes(marker), marker);
  }
  assert.doesNotMatch(publisher, /docker build|docker push|docker compose up/);
  assert.doesNotMatch(publisher, /KAORI_WEBSITE_STABLE_RELEASE_94|ACCEPTED_DIGEST/);
});

test("production Environment configuration selects runtime without topology mode", () => {
  for (const marker of [
    "WEBSITE_COMPOSE_PROJECT:",
    "WEBSITE_STATE_DIR:",
    "WEBSITE_LOOPBACK_PORT:",
    "KAORI_WEBSITE_ATTACH_EXISTING_EDGE:",
  ]) {
    assert.ok(fullAdmission.includes(marker), marker);
  }
  assert.match(publisher, /runtime_project="\$\{WEBSITE_COMPOSE_PROJECT:-kaori-website\}"/);
  assert.match(
    publisher,
    /runtime_state="\$\{WEBSITE_STATE_DIR:-\/var\/lib\/kaori-website\/deploy-state\}"/,
  );
  assert.match(publisher, /runtime_port="\$\{WEBSITE_LOOPBACK_PORT:-18080\}"/);
  assert.match(publisher, /runtime_edge="\$\{KAORI_WEBSITE_ATTACH_EXISTING_EDGE:-1\}"/);
  assert.match(publisher, /COMPOSE_PROJECT_NAME="\$runtime_project"/);
  assert.doesNotMatch(publisher, /DEPLOYMENT_TOPOLOGY|SPLIT_HOST_ENABLED/);
});

test("signed stable runtime is verified or replaced without rebuilding", () => {
  const signature = publisher.indexOf("for kind in spdxjson slsaprovenance1");
  const probe = publisher.indexOf('target_probe="$(probe_target)"');
  const deployment = publisher.indexOf("bash scripts/release/deploy-release.sh deploy");
  assert.ok(signature >= 0 && probe > signature && deployment > probe);
  assert.match(publisher, /TARGET_STATUS:READY/);
  assert.match(publisher, /TARGET_STATUS:DEPLOY/);
  assert.match(publisher, /production current container is unhealthy; manual recovery required/);
  assert.match(publisher, /production current receipt is invalid/);
  assert.match(publisher, /production target needs an independently prepared prior receipt/);
  assert.match(publisher, /production post-deployment digest is not accepted/);
  assert.match(publisher, /production target requires independently admitted provider edge/);
  assert.match(publisher, /target_action=verified/);
  assert.match(publisher, /target_action=replaced/);
  assert.doesNotMatch(publisher, /docker build|docker push|docker compose up/);
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


test("production runtime probe follows receipt health and effective target", (t) => {
  const match = publisher.match(/cat <<'REMOTE_PROBE'\n([\s\S]*?)\nREMOTE_PROBE/);
  assert.ok(match, "expected canonical read-only remote production probe");
  const dir = mkdtempSync(join(tmpdir(), "kaori-production-probe-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  const state = join(dir, "state");
  const root = join(dir, "root");
  const acceptedSha = "a".repeat(40);
  const previousSha = "b".repeat(40);
  const expected = "registry.example/kaori-website@sha256:" + "c".repeat(64);
  const oldImage = "registry.example/kaori-website@sha256:" + "d".repeat(64);
  mkdirSync(bin);
  mkdirSync(state);
  mkdirSync(join(root, "releases", acceptedSha, "server"), { recursive: true });
  const verifier = join(root, "releases", acceptedSha, "server", "verify.sh");
  writeFileSync(verifier, "#!/usr/bin/env bash\nprintf 'PASS: isolated verifier\\n'\n");
  const fakeDocker = [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    "case \"$1\" in",
    "  ps) printf 'abcdef012345\\n' ;;",
    "  inspect)",
    "    case \"$3\" in",
    "      '{{.Config.Image}}') cat \"$MOCK_RUNNING_IMAGE\" ;;",
    "      *Health*) printf '%s\\n' \"$MOCK_HEALTH\" ;;",
    "      *edge-public*) printf 'true\\n' ;;",
    "      *) exit 91 ;;",
    "    esac ;;",
    "  *) exit 92 ;;",
    "esac",
  ].join("\n");
  writeFileSync(join(bin, "docker"), fakeDocker, { mode: 0o755 });
  writeFileSync(
    join(state, "previous-release.env"),
    "KAORI_WEBSITE_IMAGE=" + oldImage + "\n",
  );
  const runtimeImage = join(state, "running-image");
  const execute = (image, sha, version, { health = "healthy", missingReceipt = false } = {}) => {
    writeFileSync(runtimeImage, image);
    const receipt = join(state, "release.env");
    if (missingReceipt) {
      rmSync(receipt, { force: true });
    } else {
      writeFileSync(
        receipt,
        [
          "KAORI_WEBSITE_IMAGE=" + image,
          "KAORI_WEBSITE_SOURCE_SHA=" + sha,
          "KAORI_WEBSITE_VERSION=" + version,
          "",
        ].join("\n"),
      );
    }
    const input = [
      "set -Eeuo pipefail",
      "expected_image=" + JSON.stringify(expected),
      "expected_sha=" + JSON.stringify(acceptedSha),
      "expected_rc=v0.1.2-rc.6",
      "root=" + JSON.stringify(root),
      "runtime_state=" + JSON.stringify(state),
      "runtime_project=kaori-website",
      "runtime_port=18080",
      "runtime_edge=1",
      match[1],
    ].join("\n");
    return spawnSync("bash", ["-s"], {
      input,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: bin + ":" + process.env.PATH,
        MOCK_RUNNING_IMAGE: runtimeImage,
        MOCK_HEALTH: health,
      },
    });
  };
  const same = execute(expected, acceptedSha, "v0.1.2-rc.6");
  assert.equal(same.status, 0, same.stderr);
  assert.match(same.stdout, /TARGET_STATUS:READY/);
  const changed = execute(oldImage, previousSha, "v0.1.2-rc.5");
  assert.equal(changed.status, 0, changed.stderr);
  assert.match(changed.stdout, /TARGET_STATUS:DEPLOY/);
  const unhealthy = execute(oldImage, previousSha, "v0.1.2-rc.5", {
    health: "unhealthy",
  });
  assert.notEqual(unhealthy.status, 0);
  assert.match(unhealthy.stderr, /production current container is unhealthy/);
  const unmanaged = execute(oldImage, previousSha, "v0.1.2-rc.5", {
    missingReceipt: true,
  });
  assert.notEqual(unmanaged.status, 0);
  assert.match(unmanaged.stderr, /production target needs an independently prepared prior receipt/);
});
