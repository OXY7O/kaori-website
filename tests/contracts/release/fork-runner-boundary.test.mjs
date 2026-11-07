import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = (name) => readFileSync(`.github/workflows/${name}.yml`, "utf8");

function job(source, name) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line === `  ${name}:`);
  assert.notEqual(start, -1, `missing job ${name}`);
  const end = lines.findIndex(
    (line, index) => index > start && /^  [a-z][a-z0-9-]*:$/.test(line),
  );
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

test("external fork code only receives isolated GitHub-hosted feedback", () => {
  const fork = workflow("community-fork-check");
  const validation = job(fork, "fork-validation");
  assert.match(fork, /pull_request:/);
  assert.match(fork, /contents: read/);
  assert.doesNotMatch(fork, /pull_request_target:|workflow_run:|secrets\./);
  assert.doesNotMatch(validation, /^\s+runs-on:\s*\[self-hosted/m);
  assert.match(validation, /head\.repo\.full_name != github\.repository/);
  assert.match(validation, /runs-on: ubuntu-24\.04/);
  assert.match(validation, /pull_request\.head\.sha/);
  assert.match(validation, /persist-credentials: false/);
  assert.match(validation, /npm ci --ignore-scripts/);
});

test("required route rejects forks on hosted runner without skip bypass", () => {
  const developer = workflow("developer-check");
  const route = job(developer, "route");
  assert.match(route, /name: Route Checks/);
  assert.match(route, /runs-on: ubuntu-24\\.04/);
  assert.doesNotMatch(route, /^    if:/m);
  assert.match(route, /HEAD_REPO.*github\\.event\\.pull_request\\.head\\.repo\\.full_name/);
  assert.match(route, /Fork PR is not trusted for KAORI staging admission/);
  assert.ok(route.indexOf("Validate issue-linked source branch") < route.indexOf("Checkout exact work SHA"));
  for (const name of ["targeted", "container-smoke", "release-registry-preflight"]) {
    assert.match(job(developer, name), /needs: route/);
  }
});

test("promotion fails untrusted PRs before scheduling privileged validation", () => {
  const quality = workflow("quality");
  const promotion = job(quality, "promotion-source");
  assert.match(promotion, /name: Promotion Policy/);
  assert.match(promotion, /runs-on: ubuntu-24\\.04/);
  assert.doesNotMatch(promotion, /^    if:/m);
  assert.match(promotion, /HEAD_REPO.*github\\.event\\.pull_request\\.head\\.repo\\.full_name/);
  assert.match(promotion, /Only kaori\\/staging may open a promotion PR to main/);
  assert.match(job(quality, "full-admission"), /needs: promotion-source/);
});
