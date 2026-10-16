# Governed website delivery

Follows the KAORI application delivery model, adapted to a static Astro site.

1. Create an Issue; use the native Issue Type and canonical KAORI taxonomy.
2. Create issue-linked branch from `kaori/staging`. Never implement features on `main`.
3. Draft PR to `kaori/staging`, run targeted Developer Check on exact work SHA.
4. Review, approve and merge using traceable merge commit.
5. Run Full Admission on exact staging SHA (Astro typecheck, formatter, security, build, browser a11y and UI contracts).
6. Build/publish one immutable OCI image; retain exact SHA, digest, SBOM and security scan evidence.
7. Deploy candidate independently to website UAT; collect light/dark/mobile visual acceptance.
8. Promote only through `kaori/staging` → `main` PR. Preserve the accepted image digest.
9. Record post-promotion verification, release metadata and rollback reference.

Do not import irrelevant Flask/PostgreSQL/Celery checks or weaken required security and browser gates. Use path-aware work-branch checks to avoid expensive full-build/deploy cycles for copy edits while preserving the staging admission boundary.

The GitHub Project **KAORI Website** tracks work using the existing KAORI Status, Type, Priority, Story Point, Sprint and relationship taxonomy. Project custom fields and native parent/child association must be set through GitHub UI if connector actions do not expose them.

## Runner and implementation parity

CI runner labels and branch authority are documented in [`CI_CD.md`](CI_CD.md). `platform-ci` handles Developer Check, `kaori-ci` handles Full Admission. Reuse requires access granted to the website repository; runner labels do not override repository registration scope. Reference KAORI's existing workflows rather than introducing a parallel taxonomy.
