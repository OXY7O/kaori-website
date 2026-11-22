import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReleaseNotes } from "../../../scripts/release/release-notes.mjs";

const publishedNotes = readFileSync("docs/releases/v0.1.2.md", "utf8");
const workflow = readFileSync(".github/workflows/release-production.yml", "utf8");
const publisher = readFileSync("scripts/release/promote-stable.sh", "utf8");

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
    () => parseReleaseNotes(publishedNotes.replace("promotion_pr: 219", "promotion_pr: no"), "v0.1.2"),
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
