import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(".github/workflows/quality.yml", "utf8");
const publisher = readFileSync("scripts/release/publish-candidate.sh", "utf8");
const sha = "a".repeat(40);
const cutoff = "2026-11-17T02:00:00Z";

const approvedIssue = {
  state: "closed",
  state_reason: "completed",
  closed_at: cutoff,
  comments: 2,
};

function comment(login, body, overrides = {}) {
  return {
    user: { login },
    body,
    created_at: "2026-11-17T01:00:00Z",
    updated_at: "2026-11-17T01:00:00Z",
    ...overrides,
  };
}

const approvals = [
  comment("lethisa", "KAORI_WEBSITE_PUBLICATION_GO:" + sha),
  comment("donibawono", "KAORI_WEBSITE_PUBLICATION_REVIEWED:" + sha),
];

function checkRights(issue = approvedIssue, comments = approvals, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kaori-website-rights-"));
  const mockCurl = [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    'if [[ "$RIGHTS_TEST_API_DOWN" == "1" ]]; then exit 22; fi',
    'case "$*" in',
    '  *"/issues/4939/comments"*) cat "$RIGHTS_TEST_COMMENTS_FILE" ;;',
    '  *"/issues/4939"*) cat "$RIGHTS_TEST_ISSUE_FILE" ;;',
    '  *) echo "unexpected API request" >&2; exit 97 ;;',
    "esac",
    "",
  ].join("\n");
  try {
    writeFileSync(join(dir, "curl"), mockCurl, { mode: 0o700 });
    writeFileSync(join(dir, "issue.json"), JSON.stringify(issue));
    writeFileSync(join(dir, "comments.json"), JSON.stringify(comments));
    return spawnSync("bash", [resolve("scripts/release/publish-candidate.sh"), "rights"], {
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        PATH: dir + delimiter + process.env.PATH,
        GITHUB_REPOSITORY: "OXY7O/kaori-website",
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/kaori/staging",
        GITHUB_WORKFLOW_REF:
          "OXY7O/kaori-website/.github/workflows/quality.yml@refs/heads/kaori/staging",
        GH_TOKEN: "test-only",
        ACCEPTED_SHA: sha,
        KAORI_WEBSITE_STAGING_AUTO: "1",
        RIGHTS_TEST_API_DOWN: "0",
        RIGHTS_TEST_ISSUE_FILE: join(dir, "issue.json"),
        RIGHTS_TEST_COMMENTS_FILE: join(dir, "comments.json"),
        ...overrides,
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("both privileged staging jobs recheck rights before RC selection and public mutation", () => {
  assert.match(
    workflow,
    /name: Verify approved source-scoped public publication rights[\s\S]*?publish-candidate\.sh rights[\s\S]*?name: Select unique signed candidate/,
  );
  assert.match(
    workflow,
    /name: Reverify recurring publication rights before public deployment[\s\S]*?publish-candidate\.sh rights[\s\S]*?name: Verify signed exact-source RC/,
  );
  assert.match(
    workflow,
    /name: Reverify rights immediately before any public host mutation[\s\S]*?publish-candidate\.sh rights[\s\S]*?name: Deploy exact signed RC/,
  );
  assert.match(publisher, /if \[\[ "\$auto_staging" == true \]\]; then\s+verify_recurring_publication_rights/);
  assert.match(publisher, /verify_recurring_publication_rights; fi\s+jq -nc --arg ref/);
  assert.match(publisher, /verify_recurring_publication_rights; fi\s+jq -n --arg tag/);
  assert.match(workflow, /KAORI_WEBSITE_AUTO_STAGING_ENABLED == 'true'/);
  assert.match(workflow, /needs: \[staging-rc-publish\]/);
});

test("closed source-specific decision with two independent reviewers passes only the rights preflight", () => {
  const result = checkRights();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: KAORI #4939 approved exact staging source/);
  assert.doesNotMatch(result.stdout + result.stderr, /docker|ssh|published|deployed/i);
});

const denied = [
  {
    label: "still-open rights issue",
    issue: { ...approvedIssue, state: "open", state_reason: null },
  },
  {
    label: "closed but not approved issue",
    issue: { ...approvedIssue, state_reason: "not_planned" },
  },
  {
    label: "missing issue status",
    issue: { ...approvedIssue, closed_at: null },
  },
  {
    label: "incomplete comment page",
    issue: { ...approvedIssue, comments: 101 },
  },
  {
    label: "no maintainer authorization",
    comments: [comment("other", "KAORI_WEBSITE_PUBLICATION_GO:" + sha), approvals[1]],
  },
  {
    label: "no independent approved reviewer",
    comments: [approvals[0], comment("other", "KAORI_WEBSITE_PUBLICATION_REVIEWED:" + sha)],
  },
  {
    label: "stale source marker",
    comments: [
      comment("lethisa", "KAORI_WEBSITE_PUBLICATION_GO:" + "b".repeat(40)),
      approvals[1],
    ],
  },
  {
    label: "approval edited after issue closed",
    comments: [
      comment("lethisa", "KAORI_WEBSITE_PUBLICATION_GO:" + sha, {
        updated_at: "2026-11-17T03:00:00Z",
      }),
      approvals[1],
    ],
  },
  {
    label: "revoked decision",
    comments: [...approvals, comment("lethisa", "KAORI_WEBSITE_PUBLICATION_REVOKED:" + sha)],
  },
];

for (const scenario of denied) {
  test("rights gate fails closed for " + scenario.label, () => {
    const result = checkRights(scenario.issue ?? approvedIssue, scenario.comments ?? approvals);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BLOCK:/);
    assert.doesNotMatch(result.stdout + result.stderr, /docker build|docker push|ssh-agent/i);
  });
}

test("an unavailable GitHub rights authority blocks instead of falling back to activation switch", () => {
  const result = checkRights(approvedIssue, approvals, { RIGHTS_TEST_API_DOWN: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK: recurring publication rights issue unavailable/);
});

test("noncanonical workflow identity cannot use the rights-only validation path", () => {
  const result = checkRights(approvedIssue, approvals, {
    GITHUB_WORKFLOW_REF:
      "OXY7O/kaori-website/.github/workflows/developer-check.yml@refs/heads/main",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCK: automatic staging RC requires canonical Full Admission/);
});
