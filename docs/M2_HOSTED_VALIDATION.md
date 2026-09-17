# M2 Hosted Validation Gate

**Status:** Blocked on non-production managed-service configuration

## Conclusion

The M2 application, domain, PostgreSQL, migration, backup/restore, and rollback gates pass in repository CI. M2 is not yet Validated because the accepted managed-service adapters and hosted browser path have not been exercised together.

Do not use production project data for this gate.

## Remaining validation sequence

1. **Neon preview database**
   - Create or select a non-production Neon project/branch for Wayfound M2.
   - Set the database boundary to `preview`.
   - Apply `web/db/migrations/0001_m2_durable_project.sql`.
   - Confirm the M2 PostgreSQL integration invariants against Neon.
   - Do not reuse production database credentials.

2. **Clerk development identity**
   - Create or select a non-production Clerk application.
   - Configure the Clerk publishable and secret keys through the deployment environment, not Git or chat.
   - Sign in with a development test user.
   - Confirm repeated requests for the same Clerk subject map to one stable Wayfound Actor.
   - Confirm unauthenticated project commands are rejected.

3. **Vercel preview**
   - Use the existing `wayfound-preview` project only after its root/build configuration is confirmed for `web/`.
   - Configure preview-only values for `DATABASE_URL`, `WAYFOUND_DATA_ENV=preview`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
   - Confirm preview configuration cannot access production project data.
   - Deploy the M2 branch as a preview; deployment success is not release approval.

4. **Hosted browser flow**
   - Sign in through Clerk.
   - Create a private project.
   - Close/reopen or start a new browser session and reopen the project.
   - Save one accepted decision.
   - Confirm its Record revision and traceability are visible/available.
   - Propose one exact-source artifact.
   - Confirm the result is `Proposed`, not `Approved`.
   - Attempt a stale write and confirm Wayfound reports a conflict instead of overwriting current state.

5. **Reconcile evidence**
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

## Blockers

| Blocker | Dependency | Owner | Next action |
| --- | --- | --- | --- |
| Managed PostgreSQL adapter not exercised on Neon | Non-production Neon connection | Project owner / implementation | Connect Neon and provision/select a preview database branch |
| Real Clerk authentication not exercised | Clerk development application and secure keys | Project owner | Configure Clerk development credentials in the preview deployment environment |
| Hosted end-to-end browser path not exercised | Neon + Clerk + Vercel preview configuration | Implementation | Deploy and run the hosted validation sequence after both dependencies are available |

## Authority rule

This gate does not authorize production release, broad hosted access, external AI processing, or formal Artifact approval.
