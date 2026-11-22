import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseReleaseNotes } from "../../../scripts/release/release-notes.mjs";

const publishedNotes = readFileSync("docs/releases/v0.1.2.md", "utf8");
const nextStableNotes = readFileSync("docs/releases/v0.1.3.md", "utf8");
const workflow = readFileSync(".github/workflows/release-production.yml", "utf8");
const publisher = readFileSync("scripts/release/promote-stable.sh", "utf8");

test("published stable notes hide authority in GitHub Preview but preserve exact binding", () => {
  for (const [source, version, promotionPr] of [
    [publishedNotes, "v0.1.2", "219"],
    [nextStableNotes, "v0.1.3", "273"],
  ]) {
    assert.match(source, /^<!--\r?\n/);
    assert.match(source, /\n-->\r?\n\r?\n# KAORI Website /);
    const notes = parseReleaseNotes(source, version);
    assert.equal(notes.promotionPr, promotionPr);
    assert.match(notes.body, /^# KAORI Website /);
    assert.doesNotMatch(notes.body, /(?:^|\n)(?:stable_tag|promotion_pr):/);
  }
});

test("legacy YAML authority remains readable; malformed and mixed delimiters fail closed", () => {
  const historical = publishedNotes
    .replace(/^<!--/, "---")
    .replace(/\n-->\r?\n/, "\n---\n");
  assert.equal(parseReleaseNotes(historical, "v0.1.2").promotionPr, "219");
  assert.equal(
    parseReleaseNotes(historical, "v0.1.2").body,
    parseReleaseNotes(publishedNotes, "v0.1.2").body,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes.replace(/^<!--/, "---"), "v0.1.2"),
    /require stable_tag and promotion_pr/,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes.replace(/\n-->\r?\n/, "\n---\n"), "v0.1.2"),
    /require stable_tag and promotion_pr/,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes.replace("promotion_pr: 219", "promotion_pr: 0"), "v0.1.2"),
    /require stable_tag and promotion_pr/,
  );
});

test("v0.1.3 authored notes bind the planned independently reviewed promotion PR", () => {
  const notes = parseReleaseNotes(nextStableNotes, "v0.1.3");
  assert.equal(notes.stableTag, "v0.1.3");
  assert.equal(notes.promotionPr, "273");
  assert.match(notes.body, /^# KAORI Website v0\.1\.3/m);
  assert.match(notes.body, /## Highlights\n[\s\S]+## Improvements/);
  assert.match(notes.body, /## Fixes\n[\s\S]+## Known Limitations/);
  assert.doesNotMatch(notes.body, /## Technical Evidence|promotion_pr:/);
  assert.throws(() => parseReleaseNotes(nextStableNotes, "v0.1.2"), /does not match/);
});

test("human-reviewed historical stable notes bind exact tag and promotion PR", () => {
  const notes = parseReleaseNotes(publishedNotes, "v0.1.2");
  assert.equal(notes.stableTag, "v0.1.2");
  assert.equal(notes.promotionPr, "219");
  assert.match(notes.body, /^# KAORI Website v0\.1\.2/m);
  assert.match(notes.body, /## Highlights\n[\s\S]+## Improvements/);
  assert.match(notes.body, /## Known Limitations/);
  assert.doesNotMatch(notes.body, /^---|promotion_pr:/m);
  assert.doesNotMatch(notes.body, /## Technical Evidence/);
});

test("release notes reject wrong version, tampered authority and placeholder text", () => {
  assert.throws(() => parseReleaseNotes(publishedNotes, "v0.1.3"), /does not match/);
  assert.throws(
    () =>
      parseReleaseNotes(publishedNotes.replace("promotion_pr: 219", "promotion_pr: no"), "v0.1.2"),
    /promotion_pr/,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes.replace("## Highlights", "## TODO"), "v0.1.2"),
    /placeholder|Highlights/,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes.replace("## Fixes", "## Fix"), "v0.1.2"),
    /Fixes/,
  );
  assert.throws(
    () => parseReleaseNotes(publishedNotes + "\n## Technical Evidence\nUnverified", "v0.1.2"),
    /technical evidence is appended/,
  );
});

test("production release needs just stable tag; promotion PR is reviewed source metadata", () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.match(workflow, /inputs\.stable_tag/);
  assert.doesNotMatch(workflow, /inputs\.promotion_pr/);
  assert.match(workflow, /id: reviewed-notes/);
  assert.match(workflow, /steps\.reviewed-notes\.outputs\.promotion_pr/);
  assert.match(workflow, /needs\.release-request\.outputs\.promotion_pr/);
  assert.match(workflow, /scripts\/release\/release-notes\.mjs verify/);
  assert.match(workflow, /name: production\n      url: https:\/\/kaori\.cloud/);
  assert.doesNotMatch(workflow, /\n  push:/);
});

test("stable publisher validates reviewed notes before target mutation and appends technical proof", () => {
  const notesGate = publisher.indexOf("node scripts/release/release-notes.mjs verify");
  const runtimeMutation = publisher.indexOf("bash scripts/release/deploy-release.sh deploy");
  const published = publisher.indexOf('published="$(curl --fail-with-body -sS');
  assert.ok(notesGate > 0);
  assert.ok(runtimeMutation > notesGate);
  assert.ok(published > runtimeMutation);
  assert.match(publisher, /reviewed release notes select a different promotion PR/);
  assert.match(publisher, /## Technical Evidence/);
  assert.match(publisher, /technical="\$\(jq -rn --arg stable/);
  assert.doesNotMatch(publisher, /technical="\$\(jq -n --arg stable/);
  assert.match(publisher, /Human UAT evidence:/);
  assert.match(publisher, /Immutable digest:/);
  assert.doesNotMatch(publisher, /docker build|docker push/);
});

test("read-only draft previews staging with GitHub's default config fallback", () => {
  const dir = mkdtempSync(join(tmpdir(), "kaori-release-draft-"));
  const log = join(dir, "gh-calls");
  const gh = join(dir, "gh");
  writeFileSync(
    gh,
    [
      "#!/usr/bin/env bash",
      'printf \'%s\n\' "$*" >> "$KAORI_TEST_DRAFT_CALLS"',
      'if [[ "$*" == *"releases/latest"* ]]; then',
      "  printf 'v0.1.2\n'",
      'elif [[ "$*" == *"releases/generate-notes"* ]]; then',
      "  printf '## Generated preview\n- Sample merged PR\n'",
      "else",
      "  exit 91",
      "fi",
      "",
    ].join("\n"),
  );
  chmodSync(gh, 0o755);

  try {
    const env = {
      ...process.env,
      PATH: dir + ":" + process.env.PATH,
      KAORI_TEST_DRAFT_CALLS: log,
    };
    const good = spawnSync("bash", ["scripts/release/prepare-notes.sh", "v0.1.3"], {
      encoding: "utf8",
      env,
    });
    assert.equal(good.status, 0, good.stderr);
    assert.match(good.stdout, /EDITORIAL DRAFT ONLY/);
    assert.match(good.stdout, /Last stable baseline: v0\.1\.2/);
    assert.match(good.stdout, /## Generated preview/);
    assert.match(good.stdout, /inspect the generated output for the release\.yml source/);
    assert.match(good.stdout, /GitHub reported staging configuration/);

    const calls = readFileSync(log, "utf8").trimEnd().split("\n");
    assert.equal(calls.length, 2);
    assert.match(calls[0], /releases\/latest/);
    assert.match(calls[1], /releases\/generate-notes/);
    assert.match(calls[1], /tag_name=v0\.1\.3/);
    assert.match(calls[1], /previous_tag_name=v0\.1\.2/);
    assert.match(calls[1], /target_commitish=kaori\/staging/);
    assert.doesNotMatch(calls.join("\n"), /configuration_file_path=/);

    const invalid = spawnSync("bash", ["scripts/release/prepare-notes.sh", "v0.1.3-rc.2"], {
      encoding: "utf8",
      env,
    });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /BLOCK: usage/);
    assert.equal(readFileSync(log, "utf8").trimEnd().split("\n").length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
