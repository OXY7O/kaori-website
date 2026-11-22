# Contributing to KAORI Website

Thanks for your interest in improving the KAORI Website. Whether you have a
question, spot a broken link or want to suggest a better experience, your
feedback is welcome.

**Current contribution status:** The repository is public and accepts
feedback, but **external code contributions are not yet generally approved
for direct adoption or merge**. The [KAORI rights assessment](https://github.com/OXY7O/KAORI/issues/4212)
and [community onboarding decision](https://github.com/OXY7O/KAORI/issues/4217)
are still open. The instructions below explain the existing **controlled
proposal and fork-test** process; they are not an announcement that the
community launch has been approved.

## Start with an idea or a bug report

Check [existing issues](https://github.com/OXY7O/kaori-website/issues) before
starting. For a new, **non-security** request, explain the problem, what you
expected, what happened, and a small example or screenshot if useful. A
maintainer will triage the proposal and identify an appropriate issue scope.

**Security vulnerability?** Do not post exploit details or secrets in an
issue or pull request. Follow our [private reporting guidance](https://github.com/OXY7O/.github/blob/main/SECURITY.md).

## Trying a change in your own fork

If a maintainer has authorized an isolated fork test or proposal:

1. [Fork the Website repository](https://github.com/OXY7O/kaori-website/fork).
2. Create a new branch **from the official `kaori/staging` branch**, not from
   your fork's `main`. This avoids bringing unrelated old commits into a PR.
3. Keep changes small and connected to the governing issue.
4. Run the local checks where possible.
5. Push your branch and open a PR targeting **`OXY7O/kaori-website:kaori/staging`**,
   not `main`. Use the existing PR template and include the related issue.

A quick local example (replace the placeholder):

```bash
git clone https://github.com/YOUR_USERNAME/kaori-website.git
cd kaori-website
git remote add upstream https://github.com/OXY7O/kaori-website.git
git fetch upstream kaori/staging
git switch -c kaori/chore-123-improve-copy upstream/kaori/staging
# Make the approved change.
npm ci --ignore-scripts --no-audit --no-fund
npm run check-format
npm run check
npm run build
git diff --check
git push -u origin kaori/chore-123-improve-copy
```

Replace `123` with the governing issue number. If you already have an
`upstream` remote, do not add it again. For full instructions, screenshots,
branch troubleshooting and the original controlled fork test, see the
[development guide](docs/DEVELOPMENT.md#external-fork-prs--controlled-pre-launch-procedure).

## What happens after a fork PR?

The **Community Fork Check** runs limited formatting, typechecking and build
checks on an isolated GitHub-hosted runner **without release secrets**. It
offers feedback; it does **not** grant access to trusted runners, approval to
merge, or authorization to publish anything.

The trusted **Developer Check** intentionally rejects a direct external fork
PR. This protects self-hosted runners and deployment credentials. A maintainer
may decide to reproduce a suitable proposal in an authorized, issue-linked
branch within the official repository, then use the standard Developer Check,
independent review, staging Full Admission, acceptance and promotion flow.

Please don't interpret a passing fork check as a promise that a proposal will
be accepted or scheduled. See the
[organization contributing policy](https://github.com/OXY7O/.github/blob/main/CONTRIBUTING.md)
for shared guidance.

## License and project boundaries

The KAORI Website's original software source is licensed under
[Apache-2.0](LICENSE). The separate [NOTICE](NOTICE) explains KAORI branding,
artwork and third-party materials. Do not submit material you lack permission
to distribute. The public Website is informational; it is not the
authenticated KAORI Application, a live provider dashboard, or a release
permission channel.
