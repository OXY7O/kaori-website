import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const candidateSha = "a".repeat(40);
const priorSha = "b".repeat(40);
const candidateImage = "registry.example/kaori-website@sha256:" + "c".repeat(64);
const priorImage = "registry.example/kaori-website@sha256:" + "d".repeat(64);
const candidateVersion = "v0.1.2-rc.6";
const priorVersion = "v0.1.2-rc.5";

const fakeDocker = String.raw`#!/usr/bin/env bash
set -Eeuo pipefail
case "$1" in
  info|pull) exit 0 ;;
  image)
    [[ "$2" == inspect ]] || exit 70
    case "$4" in
      *org.opencontainers.image.revision*) printf '%s\n' "$MOCK_CANDIDATE_SHA" ;;
      *org.opencontainers.image.version*) printf '%s\n' '0.1.2-rc.6' ;;
      *) exit 71 ;;
    esac
    ;;
  compose)
    case " $* " in
      *" config --quiet "*) exit 0 ;;
      *" up -d "*) printf '%s\n' "$KAORI_WEBSITE_IMAGE" > "$MOCK_RUNNING_IMAGE" ;;
      *" ps -q web "*) printf '%s\n' 'mock-uat-container' ;;
      *) exit 72 ;;
    esac
    ;;
  inspect)
    case "$3" in
      *".Config.Image"*) cat "$MOCK_RUNNING_IMAGE" ;;
      *".State.Health.Status"*)
        if [[ "$MOCK_FAIL_CANDIDATE" == 1 &&
              "$(cat "$MOCK_RUNNING_IMAGE")" == "$MOCK_CANDIDATE_IMAGE" ]]; then
          printf 'unhealthy\n'
        else
          printf 'healthy\n'
        fi
        ;;
      *) exit 73 ;;
    esac
    ;;
  exec)
    case "$3" in
      id) printf '101\n' ;;
      wget)
        url="$7"
        if [[ "$url" == */healthz ]]; then
          printf 'healthy\n'
        elif [[ "$(cat "$MOCK_RUNNING_IMAGE")" == "$MOCK_CANDIDATE_IMAGE" ]]; then
          cat "$MOCK_CANDIDATE_HTML"
        else
          cat "$MOCK_PRIOR_HTML"
        fi
        ;;
      *) exit 74 ;;
    esac
    ;;
  port) printf '127.0.0.1:18083\n' ;;
  *) exit 75 ;;
esac
`;

const fakeCurl = String.raw`#!/usr/bin/env bash
[[ "$6" == http://127.0.0.1:18083/healthz ]] || exit 76
printf 'healthy\n'
`;

function fixture(t, { failCandidate = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kaori-website-uat-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  const state = join(dir, "state");
  mkdirSync(bin);
  mkdirSync(state);
  const scriptDir = join(dir, "server");
  mkdirSync(scriptDir);
  // UAT's real fixed state path guard must remain intact in the repository.
  // For this fake-Docker-only test, isolate a copy under the temp fixture.
  const guard = '[[ "$state_dir" == /opt/kaori-website/uat/deploy-state ]]';
  const deploySource = readFileSync(resolve("deploy/server/deploy.sh"), "utf8");
  assert.equal(deploySource.split(guard).length, 2, "canonical UAT state guard changed");
  for (const filename of [
    "deploy.sh",
    "verify.sh",
    "compose.website.yml",
    "compose.uat.yml",
  ]) {
    const original = readFileSync(resolve("deploy/server", filename), "utf8");
    const sandboxed =
      filename === "deploy.sh"
        ? original.replace(guard, '[[ "$state_dir" == "' + state + '" ]]')
        : original;
    writeFileSync(join(scriptDir, filename), sandboxed);
  }
  writeFileSync(join(bin, "docker"), fakeDocker, { mode: 0o755 });
  writeFileSync(join(bin, "curl"), fakeCurl, { mode: 0o755 });
  writeFileSync(join(state, "running-image"), candidateImage);
  // The early brand marker plus a large stream reproduces wget | grep -q SIGPIPE.
  writeFileSync(
    join(state, "candidate.html"),
    "<html><title>KAORI</title><body>" +
      "x".repeat(262144) +
      "<footer>Website build " +
      candidateVersion +
      "</footer></body></html>",
  );
  writeFileSync(
    join(state, "prior.html"),
    "<html><title>KAORI</title><body><footer>Website build " +
      priorVersion +
      "</footer></body></html>",
  );
  return {
    state,
    scriptDir,
    env: {
      ...process.env,
      PATH: bin + ":" + process.env.PATH,
      COMPOSE_PROJECT_NAME: "kaori-website-uat",
      KAORI_WEBSITE_RUNTIME_ENV: "uat",
      KAORI_WEBSITE_RELEASE_LOCAL_ONLY: "1",
      KAORI_WEBSITE_STATE_DIR: state,
      KAORI_WEBSITE_IMAGE: candidateImage,
      KAORI_WEBSITE_EXPECTED_VERSION: candidateVersion,
      MOCK_RUNNING_IMAGE: join(state, "running-image"),
      MOCK_CANDIDATE_IMAGE: candidateImage,
      MOCK_CANDIDATE_HTML: join(state, "candidate.html"),
      MOCK_PRIOR_HTML: join(state, "prior.html"),
      MOCK_CANDIDATE_SHA: candidateSha,
      MOCK_FAIL_CANDIDATE: failCandidate ? "1" : "0",
    },
  };
}

function run(script, args, env) {
  return spawnSync("bash", [resolve(script), ...args], {
    env,
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
}

test("UAT verifier consumes large homepage without pipefail SIGPIPE", (t) => {
  const { env } = fixture(t);
  const result = run("deploy/server/verify.sh", [], env);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /PASS: isolated UAT Website footer build version v0\.1\.2-rc\.6/,
  );
});

test("UAT verifier rejects wrong expected signed build version", (t) => {
  const { env } = fixture(t);
  const result = run("deploy/server/verify.sh", [], {
    ...env,
    KAORI_WEBSITE_EXPECTED_VERSION: "v0.1.2-rc.7",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK: UAT footer build identity differs/);
});

test("failed candidate restores and verifies prior committed build identity", (t) => {
  const { env, state, scriptDir } = fixture(t, { failCandidate: true });
  const receipt = [
    "KAORI_WEBSITE_IMAGE=" + priorImage,
    "KAORI_WEBSITE_SOURCE_SHA=" + priorSha,
    "KAORI_WEBSITE_VERSION=" + priorVersion,
    "",
  ].join("\n");
  const receiptPath = join(state, "release.env");
  writeFileSync(receiptPath, receipt);
  writeFileSync(env.MOCK_RUNNING_IMAGE, priorImage);
  const result = run(
    join(scriptDir, "deploy.sh"),
    [candidateImage, candidateSha, candidateVersion],
    env,
  );
  assert.notEqual(result.status, 0, "rejected candidate must not be committed");
  assert.match(result.stderr, /RECOVERED: previous website digest is healthy/);
  assert.doesNotMatch(result.stderr, /CRITICAL: previous website recovery failed/);
  assert.equal(readFileSync(receiptPath, "utf8"), receipt);
  assert.equal(readFileSync(env.MOCK_RUNNING_IMAGE, "utf8").trim(), priorImage);
});

test("invalid prior release receipt blocks before container replacement", (t) => {
  const { env, state, scriptDir } = fixture(t);
  const receipt = [
    "KAORI_WEBSITE_IMAGE=" + priorImage,
    "KAORI_WEBSITE_SOURCE_SHA=" + priorSha,
    "KAORI_WEBSITE_VERSION=unreviewed",
    "",
  ].join("\n");
  writeFileSync(join(state, "release.env"), receipt);
  writeFileSync(env.MOCK_RUNNING_IMAGE, priorImage);
  const result = run(
    join(scriptDir, "deploy.sh"),
    [candidateImage, candidateSha, candidateVersion],
    env,
  );
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /BLOCK: previous release receipt contains an invalid build version/,
  );
  assert.equal(readFileSync(env.MOCK_RUNNING_IMAGE, "utf8"), priorImage);
});
