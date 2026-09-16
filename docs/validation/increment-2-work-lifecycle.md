# Increment 2 — Owner work lifecycle validation

**Status:** Validated

**Date:** 2026-09-13

**Validated application head:** `1c3d8a52a820163340b8742f3f8f3a24f7115545`

**CI run:** [179](https://github.com/Ryan9876/wayfound/actions/runs/34786632363)

## Result

Owner-controlled work approval, start, block, and resume passed real Supabase/PostgreSQL and built Next.js acceptance tests. The complete prior durable regression chain passed. Both CI jobs completed successfully. Increment 2 remains In progress; this is its ninth Validated bounded slice.

Exact focused result:

> PASS: owner work approval/start/block/resume preserves responsibility and qualified-review boundaries; exact-state concurrency, transactional history/audit/idempotency, invalid-state/target denial, tenant/specialist/session/revocation isolation, direct-table denial, rollback/retry, restart/re-login persistence, database interruption/recovery, external-reference non-fetch, stale-form errors, keyboard access, and desktop/390 px rendering passed.

## Executed evidence

Run 179 applied migration `20260913221516_owner_work_lifecycle.sql`. The security advisor reported `No issues found`. TypeScript, production build, prototype structure, accessibility baseline, and keyboard checks passed.

The durable job passed, in sequence:

1. Workspace, owner decisions, proposed work items, and approved requirements/criteria.
2. Criterion evidence.
3. Proposed artifacts.
4. Artifact acceptance.
5. Assignment-scoped specialist review.
6. Owner work lifecycle.

The focused suite established:

- New work still starts Proposed with revision 1 and no fabricated transition history.
- The built owner UI performs Proposed → Approved → In progress → Blocked → In progress.
- Each transition records a required reason, current actor, timestamp, stable transition ID, and old/new states and revisions.
- Missing confirmation, empty/overlong reason, invalid revision, unsupported completion/release states, skipped transitions, same-state changes, stale revisions, unknown work, and cross-workspace targets fail.
- An assigned specialist cannot mutate the owner's work. Temporarily giving a second actor explicit owner membership in the isolated test still does not let that actor mutate work owned by someone else.
- Concurrent identical approvals and resumes return one original result. Concurrent distinct start requests at the same revision produce one winner and one stale-state error.
- Changed reuse of a request fails. Original identical replay after later transitions returns its original ID without reverting work state.
- Transition/history, audit, and request counts agree. An injected audit failure leaves all three unchanged and restores the exact work record; the same request succeeds after the failure is removed.
- Direct private-table operations fail. `authenticated` has no SELECT/INSERT/UPDATE/DELETE grant on work, transition, or transition-request tables; RLS is enabled on all three.
- Anonymous, expired, signed-out, revoked-session, and revoked-membership mutations fail. Revoked/expired reads and idempotent replays fail as applicable. An unexpired token retained before sign-out or session deletion does not bypass live-session validation.
- Work ownership, content, release/stage, and creation time remain unchanged. Existing decisions, requirements, criteria, evidence, artifacts/versions, specialist assignment/review records, release, and stage records are unchanged by work transitions.
- A stale browser form fails with an accessible recovery message.
- Restart and re-login preserve state and complete history. Another tenant cannot open the owner workspace.
- Database interruption renders the recoverable workspace error. Recovery restores the same committed record without fixture fallback.
- The stored external artifact reference receives zero requests.

## Rendered review

Run 179 screenshot artifact:

- Name: `workspace-screenshots`
- Artifact ID: `10327410515`
- Digest: `sha256:d2b0072f1563a5e42125b13616c487f7f649e9f1113e86139b29ad1d77ccf1c1`
- Size: 12,300,042 bytes
- [Artifact](https://github.com/Ryan9876/wayfound/actions/runs/34786632363/artifacts/10327410515)

The downloaded ZIP digest matched the recorded GitHub digest. The following generated screenshots were inspected directly:

- `work-lifecycle-blocked-desktop-work.png`
- `work-lifecycle-blocked-mobile-work.png`
- `work-lifecycle-resumed-desktop-work.png`
- `work-lifecycle-resumed-mobile-work.png`
- `work-lifecycle-stale-error.png` (including a focused inspection of the error/form)
- `work-lifecycle-database-unavailable.png`

Desktop and 390 px mobile inspection confirmed readable state text, current blocker/latest reason, allowed next action, explicit authority confirmation, and expandable transition history. Actor/transition/work IDs and timestamps wrap. Open history preserves earlier blocker and resolution reasons. Keyboard focus is visible on controls and history summaries. The stale-form message tells the owner to reload and review current state; entered reason remains visible. The database error states that the saved record has not been replaced.

Normal UI regression artifact: `10327445137`, digest `sha256:8b65db01c670cca68c85d075ed0a636b89c955166edb7c1cff12ca79f0c244d3`.

## Authority and recovery limits

ADR-0003 is unchanged. Work approval accepts the owner's bounded planned work; it does not approve consequential technical choices. Work state is the authenticated owner's report, not independent evidence of execution. No collaborator assignment, specialist membership, completion, verification, validation, release, or production authorization is introduced.

The migration preserves existing records. Do not restore the old Proposed-only constraint after transitions exist. The old reader would label transitioned work incorrectly; retain a state-aware reader during recovery and prefer a forward fix. This test is not a production backup/restore exercise.

Local TypeScript/build checks also passed. Real backend execution used the existing isolated CI environment because the authoring workspace did not have Docker. No hosted services were provisioned.

CI screenshot artifacts use the repository's seven-day retention policy. The artifact IDs, digests, application head, run, and test source identify the executed evidence; this record does not imply indefinite artifact availability.

## Reconciliation

The slice specification, ADR-0002 implementation note, architecture, delivery plan, creation-slice extension note, README, and local test instructions are reconciled with this behavior. PR #1 remains open, draft, and unmerged. Exact-head CI after documentation reconciliation must be confirmed separately; this record identifies the application acceptance run and does not predict a future run result.
