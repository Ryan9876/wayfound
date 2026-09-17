# Optional Hosted Compatibility Evidence

**Status:** Non-blocking for M2 local-first validation

## Conclusion

ADR-0009 makes local operation the default Wayfound runtime. Hosted Vercel/Neon/Clerk integration is therefore **not an M2 merge or validation gate**.

This file preserves useful compatibility evidence created before the local-first correction so the work is not lost and future hosted/team mode has a starting point.

## Neon compatibility evidence

A dedicated non-production Neon project exists:

- Project: `wayfound-preview`
- Project ID: `quiet-dew-47401752`
- Branch: `preview`
- Branch ID: `br-wispy-bread-b4e3stux`
- Database: `wayfound`
- PostgreSQL: 17
- Region: AWS `us-east-2`
- History retention: 21,600 seconds (current account maximum for this validation project)

The earlier PostgreSQL M2 migration applied successfully. Neon reported the expected table set and confirmed important constraints including Actor provider/subject uniqueness, project membership/role constraints, project-version rules, and an Artifact lifecycle limited to `draft`, `proposed`, and `set-aside` with no `approved` value.

This project contains validation infrastructure only. It is not part of the default local runtime and does not define Wayfound retention policy.

## Vercel observation

The existing Vercel project `wayfound-preview` serves the earlier Borrow Desk / overview fixture prototype. Preserve it as a visual/prototype reference.

Do not create or configure a new hosted M2 Vercel project merely to complete local-first M2.

## Clerk observation

The repository retains a Clerk adapter for possible hosted identity use. Clerk is not required for local mode and real Clerk sign-in is no longer an M2 validation dependency.

If hosted/team mode is approved later, use a non-production identity environment and keep Wayfound project authorization application-owned.

## Optional future hosted validation sequence

If hosted/team mode becomes approved work later, validate at minimum:

1. hosted identity maps to a stable Wayfound Actor
2. hosted persistence implements the same revision/traceability/concurrency contracts as local mode
3. preview/development cannot access production project data
4. browser create → reopen → save → propose behavior matches local domain semantics
5. stale writes fail rather than overwrite
6. external/hosted privacy, retention, deletion, consent, and age-related requirements are approved before broad real-user-content use

## Current authority rule

Local SQLite + local Actor are the M2 default authority adapters.

Hosted compatibility evidence does not authorize production release, broad hosted access, external AI processing, or formal Artifact approval.
