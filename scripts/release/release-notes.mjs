#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tagPattern = /^v[0-9]+\.[0-9]+\.[0-9]+$/;
const headings = ["Highlights", "Improvements", "Fixes", "Known Limitations"];

/**
 * Parse only a reviewed version-specific Markdown file in the tracked repository.
 * Strict stable_tag/promotion_pr authority is kept in a leading HTML comment
 * so GitHub Preview starts with the release title, not a metadata table.
 * Historical YAML frontmatter stays valid for source reproducibility.
 * Neither form appears in the published release body.
 */
export function parseReleaseNotes(source, requestedTag) {
  if (!tagPattern.test(requestedTag)) {
    throw new Error("stable version must be vX.Y.Z");
  }
  const authorityPatterns = [
    /^<!--\r?\nstable_tag: (v[0-9]+\.[0-9]+\.[0-9]+)\r?\npromotion_pr: ([1-9][0-9]*)\r?\n-->\r?\n\r?\n([\s\S]+)$/,
    /^---\r?\nstable_tag: (v[0-9]+\.[0-9]+\.[0-9]+)\r?\npromotion_pr: ([1-9][0-9]*)\r?\n---\r?\n\r?\n([\s\S]+)$/,
  ];
  const match = authorityPatterns.map((pattern) => source.match(pattern)).find(Boolean);
  if (!match) {
    throw new Error("reviewed notes require stable_tag and promotion_pr metadata");
  }
  const [, recordedTag, promotionPr, body] = match;
  if (recordedTag !== requestedTag) {
    throw new Error("release notes stable version does not match requested release");
  }
  const markdown = body.trim();
  if (!markdown.startsWith(`# KAORI Website ${requestedTag}\n`)) {
    throw new Error("release notes must begin with the exact stable version");
  }
  if (/\b(TODO|TBD|PLACEHOLDER)\b|<insert[^>]*>/i.test(markdown)) {
    throw new Error("release notes still contain placeholder content");
  }
  if (/^## Technical Evidence\s*$/m.test(markdown)) {
    throw new Error("technical evidence is appended from verified release runtime");
  }
  let previousIndex = -1;
  for (const title of headings) {
    const heading = `## ${title}\n`;
    const index = markdown.indexOf(heading);
    if (index < 0 || index <= previousIndex) {
      throw new Error(`release notes missing or misordered ${title}`);
    }
    const nextHeading = markdown.indexOf("\n## ", index + heading.length);
    const section = markdown.slice(
      index + heading.length,
      nextHeading < 0 ? undefined : nextHeading,
    );
    if (!section.trim() || /^[-*]\s*$/m.test(section.trim())) {
      throw new Error(`release notes ${title} is empty`);
    }
    previousIndex = index;
  }
  if (markdown.length < 200) {
    throw new Error("release notes require a useful human-readable summary");
  }
  return { stableTag: recordedTag, promotionPr, body: markdown };
}

function main() {
  const [mode, stableTag, requestedPromotionPr] = process.argv.slice(2);
  if (!["verify", "promotion-pr", "body"].includes(mode) || !tagPattern.test(stableTag ?? "")) {
    throw new Error("usage: release-notes.mjs verify|promotion-pr|body vX.Y.Z [expected-PR]");
  }
  const path = resolve("docs", "releases", `${stableTag}.md`);
  const notes = parseReleaseNotes(readFileSync(path, "utf8"), stableTag);
  if (requestedPromotionPr !== undefined && notes.promotionPr !== requestedPromotionPr) {
    throw new Error("reviewed release notes promotion PR does not match accepted UAT lineage");
  }
  if (mode === "promotion-pr") {
    process.stdout.write(`${notes.promotionPr}\n`);
  } else if (mode === "body") {
    process.stdout.write(`${notes.body}\n`);
  } else {
    process.stdout.write(
      `PASS: human-reviewed release notes ${stableTag}, PR #${notes.promotionPr}\n`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`BLOCK: ${error.message}\n`);
    process.exitCode = 1;
  }
}
