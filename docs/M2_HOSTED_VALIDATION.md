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

Preserve that deployment as a visual/prototype reference. M2 hosted validation will use a separate Vercel project named `wayfound-m2-preview`, connected to the `Ryan9876/wayfound` repository with **Root Directory = `web`**. The M2 branch must deploy as a Preview environment; the preview project does not authorize production release.

## Clerk setup decision

Use Clerk's native Vercel Marketplace integration for M2 instead of manually copying Clerk keys through chat or committing them to Git.

For the `wayfound-m2-preview` Vercel project:

- provision a Clerk application/resource through the Vercel Marketplace
- use Clerk's development instance for Vercel Development and Preview environments
- allow the integration to sync `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into the Vercel project
- do not use production Clerk credentials for M2 validation
- keep Wayfound project authorization application-owned; Clerk proves identity only

The current M2 code already expects exactly those two Clerk variables and maps the authenticated Clerk `userId` to a stable internal Wayfound Actor.

## Remaining validation sequence

1. **Create the M2 Vercel project**
   - Create `wayfound-m2-preview` as a separate Vercel project.
   - Connect it to `Ryan9876/wayfound`.
   - Set Root Directory to `web`.
   - Preserve the existing `wayfound-preview` fixture project unchanged.

2. **Provision Clerk through Vercel Marketplace**
   - Install/provision a non-production Clerk application/resource for `wayfound-m2-preview`.
   - Confirm the Clerk development instance is connected to Vercel Preview/Development.
   - Confirm Vercel has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` without exposing either value in Git or chat.

3. **Configure preview-only data values**
   - Set `WAYFOUND_DATA_ENV=preview` for the Vercel Preview environment.
   - Set `DATABASE_URL` to the dedicated Neon preview database using Vercel's secure environment-variable storage.
   - Do not expose the connection string in Git, PR comments, or chat.
   - Do not configure any production project database for this validation project.

4. **Deploy the M2 branch as Preview**
   - Deploy `feature/m2-durable-project-slice` through the `wayfound-m2-preview` project.
   - Confirm the runtime sees Vercel Preview and `WAYFOUND_DATA_ENV=preview` as matching environments.
   - Confirm a configuration mismatch fails closed before durable project operations.

5. **Hosted identity checks**
   - Sign in with a Clerk development test user.
   - Confirm repeated requests for the same Clerk subject map to one stable Wayfound Actor.
   - Confirm unauthenticated protected project commands are rejected.

6. **Hosted browser flow**
   - Create a private project.
   - Close/reopen or start a new browser session and reopen the project.
   - Save one accepted decision.
   - Confirm its Record revision and traceability are visible/available.
   - Propose one exact-source artifact.
   - Confirm the result is `Proposed`, not `Approved`.
   - Attempt a stale write and confirm Wayfound reports a conflict instead of overwriting current state.

7. **Reconcile evidence**
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
| Separate M2 preview project not provisioned | Vercel project connected to `Ryan9876/wayfound` with root `web` | Project owner | Create `wayfound-m2-preview` and connect the repository |
| Real Clerk authentication not exercised | Clerk Marketplace resource connected to the M2 preview project | Project owner | Provision Clerk through Vercel Marketplace |
| Secure preview runtime values not configured | Vercel Preview environment | Project owner | Store `DATABASE_URL` and `WAYFOUND_DATA_ENV=preview`; Clerk integration supplies Clerk keys |
| Hosted end-to-end browser path not exercised | Clerk + Vercel M2 preview configuration | Implementation | Deploy and run the hosted validation sequence after the above dependencies are available |

## Authority rule

This gate does not authorize production release, broad hosted access, external AI processing, or formal Artifact approval.
