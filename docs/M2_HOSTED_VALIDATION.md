# M2 Hosted Validation Gate

**Status:** Partially validated; blocked on Clerk and hosted browser integration

## Conclusion

The M2 application, domain, PostgreSQL, migration, backup/restore, rollback, and managed Neon schema gates pass. M2 is not yet fully Validated because real Clerk authentication and the hosted browser path have not been exercised together with the M2 application.

Do not use production project data for this gate.

## Current Neon observation

A dedicated non-production Neon project now exists for M2 hosted validation:

- Project: `wayfound-preview`
- Project ID: `quiet-dew-47401752`
- Branch: `preview`
- Branch ID: `br-wispy-bread-b4e3stux`
- Database: `wayfound`
- PostgreSQL: 17
- Region: AWS `us-east-2`
- History retention: 21,600 seconds (the current account maximum for this project)

The exact `web/db/migrations/0001_m2_durable_project.sql` schema was applied to this preview branch. Neon reports all 13 expected M2 tables. Constraint inspection confirms, among other invariants:

- `(provider, external_subject)` is unique for Actors
- project membership is keyed by `(project_id, actor_id)`
- only the M2 `owner` membership role exists
- project version must remain at least 1
- Artifact lifecycle is restricted to `draft`, `proposed`, and `set-aside`
- no `approved` Artifact lifecycle value exists in the managed preview schema

This Neon project is validation infrastructure only. Its 6-hour Neon history-retention limit does not define Wayfound product retention policy.

## Current Vercel observation

The connected Vercel project `wayfound-preview` currently serves the earlier Borrow Desk / overview prototype with fixture data. Its current project metadata does not record a Git repository link, and its latest deployment is not the M2 application.

Do not treat `wayfound-preview.vercel.app` as M2 validation evidence and do not overwrite it casually. Before M2 deployment, explicitly confirm whether this project should be repurposed or whether M2 should use a separate preview project, and configure the application root for `web/`.

## Remaining validation sequence

1. **Clerk development identity**
   - Create or select a non-production Clerk application.
   - Configure the Clerk publishable and secret keys through the deployment environment, not Git or chat.
   - Sign in with a development test user.
   - Confirm repeated requests for the same Clerk subject map to one stable Wayfound Actor.
   - Confirm unauthenticated project commands are rejected.

2. **Vercel M2 preview**
   - Confirm whether to repurpose `wayfound-preview` or use a separate M2 preview project.
   - Confirm the deployment root/build configuration targets `web/`.
   - Configure preview-only values for `DATABASE_URL`, `WAYFOUND_DATA_ENV=preview`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
   - Use the dedicated Neon preview database above; do not use production database credentials.
   - Confirm preview configuration cannot access production project data.
   - Deploy the M2 branch as a preview; deployment success is not release approval.

3. **Hosted browser flow**
   - Sign in through Clerk.
   - Create a private project.
   - Close/reopen or start a new browser session and reopen the project.
   - Save one accepted decision.
   - Confirm its Record revision and traceability are visible/available.
   - Propose one exact-source artifact.
   - Confirm the result is `Proposed`, not `Approved`.
   - Attempt a stale write and confirm Wayfound reports a conflict instead of overwriting current state.

4. **Reconcile evidence**
   - Record hosted validation evidence in `docs/PRODUCT_REQUIREMENTS.md`.
   - Change WF-017 through WF-022 to `Validated` only where all acceptance criteria actually passed.
   - Update `docs/DELIVERY_PLAN.md` and PR #9.
   - Keep real hosted user-content release blocked until retention, deletion, consent, and age-related requirements are approved.

## Evidence already complete

The current PR #9 CI proves:

- dependency install
- domain and content-minimal telemetry tests
- TypeScript check
- Next.js production build
- PostgreSQL 17 migration
- command idempotency
- immutable Answer and Record revisions
- exact revision trace links
- optimistic concurrency conflict behavior
- exact-current-source proposal behavior
- nonmember project isolation
- database rejection of `approved` as an M2 Artifact state
- stable provider-subject to internal Actor persistence behavior
- synthetic database backup and restore
- migration rollback, schema-absence verification, and reapply

The Neon preview validation additionally proves:

- the accepted migration applies on managed Neon PostgreSQL 17
- the complete M2 table set exists on the preview branch
- critical Actor, membership, Project, and Artifact constraints match the repository migration
- the managed preview schema contains no `approved` Artifact lifecycle value

## Blockers

| Blocker | Dependency | Owner | Next action |
| --- | --- | --- | --- |
| Real Clerk authentication not exercised | Clerk development application and secure keys | Project owner | Configure Clerk development credentials in the preview deployment environment |
| Hosted end-to-end browser path not exercised | Clerk + Vercel M2 preview configuration | Implementation | Deploy and run the hosted validation sequence after Clerk is configured |
| Existing Vercel preview is the older fixture prototype | Preview project/root decision | Project owner / implementation | Preserve it and create a separate M2 preview, or explicitly approve repurposing it |

## Authority rule

This gate does not authorize production release, broad hosted access, external AI processing, or formal Artifact approval.
