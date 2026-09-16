# Increment 2 — Work implementation completion

**Status:** Validated

**Parent:** Increment 2 — Durable single-owner workspace record

**Architecture basis:** Accepted ADR-0002 and ADR-0005

**Validated application head:** `b28e1718174d84e66c7e97fe203de12034d3b2ba` through CI run 308

**Validation evidence:** [validation/increment-2-work-completion.md](validation/increment-2-work-completion.md)

## Outcome

The current workspace owner can mark their in-progress work as `Implemented` after recording what was completed. The saved record preserves the transition, actor, time, reason, and revision after restart and re-login.

This slice advances `WF-REC-001` and `WF-REC-002` and implements the first remaining Increment 2 item in `DELIVERY_PLAN.md`: work completion / implementation-state transition without implying verification.

## State and authority rules

The slice adds one allowed transition:

| Current state | Action | Result | Required confirmation |
| --- | --- | --- | --- |
| In progress | Mark implemented | Implemented | The owner confirms the described work is complete as implemented work. |

Existing transitions remain unchanged:

- `Proposed` → `Approved`
- `Approved` → `In progress`
- `In progress` → `Blocked`
- `Blocked` → `In progress`

`Implemented` is terminal for this bounded slice. A blocked item must be resumed before it can be marked implemented. Reopen, cancel, supersede, verify, validate, release, and delete transitions remain outside this slice.

The authenticated actor must have current explicit `owner` membership and must equal the stored work-item owner. The command continues to derive actor authority from the live session and durable membership. Caller-supplied actor, release, stage, or authority identifiers are not accepted.

## Meaning of Implemented

`Implemented` means the owner reports that the bounded work described by the work item is complete.

It does **not** mean:

- the completion condition was objectively verified;
- expected evidence exists or is current;
- an acceptance criterion passed;
- AI or an external specialist reviewed the result;
- the current stage is complete;
- the release is validated, ready, authorized, deployed, or released.

Marking work implemented must not create, alter, or imply any verification, evidence, requirement, artifact, decision, stage, or release state.

## Persistence and concurrency

Extend the existing `transition_work_item` transaction instead of adding a parallel mutation path.

The command continues to require:

- workspace ID;
- work-item ID;
- expected work-item revision;
- target status;
- a non-empty reason limited to 2000 characters;
- explicit confirmation;
- request UUID.

For `Implemented`, the target work item must be `In progress` at the expected revision. The transaction changes the status to `Implemented`, increments the revision, writes immutable transition history, records the existing `work_item.transitioned` audit event, and stores the idempotent request result.

Existing concurrency, idempotency, authorization, revocation, rollback, retry, and direct-table-denial behavior remains unchanged. An injected audit failure must roll back the work status, revision, transition history, audit event, and request result.

## User interface

For an `In progress` item, show two explicit actions:

1. `Mark implemented`
2. `Block work`

Each action uses its own plain-language reason and confirmation. `Mark implemented` asks what was completed. `Block work` continues to ask what prevents progress.

For an `Implemented` item:

- show status `Implemented` in text;
- show the latest completion note;
- retain earlier transition history under progressive disclosure;
- show no further work-state action in this slice;
- state that verification is separate.

The Overview recommendation must not treat an `Implemented` item as unfinished current work. If no unfinished current-stage work exists, guidance falls back to the stage recommendation rather than reopening implemented work implicitly.

## Failure behavior

Reject without changing state when:

- the target item is not `In progress`;
- the expected revision is stale;
- the reason is empty or over 2000 characters;
- confirmation is missing;
- the target is unknown or belongs to another workspace;
- the live actor is not the current owner responsible for the work;
- the session or membership was revoked;
- a transition is requested from `Implemented` to another state.

Ambiguous save failures continue to offer an identical retry without claiming that an unconfirmed mutation did not commit. Database interruption must show a recoverable error and must not substitute fixture state.

## Acceptance criteria

All acceptance criteria below passed at application head `b28e1718174d84e66c7e97fe203de12034d3b2ba` through CI run [308](https://github.com/Ryan9876/wayfound/actions/runs/34849736796). See the [validation record](validation/increment-2-work-completion.md) for executed evidence, rendered inspection, and limits.

1. An authenticated current owner can transition their exact `In progress` work revision to `Implemented` with a reason and explicit confirmation.
2. The UI offers both `Mark implemented` and `Block work` while work is `In progress`, and offers no further lifecycle mutation after `Implemented`.
3. The durable record retains the `In progress` → `Implemented` transition with stable transition ID, actor, timestamp, reason, old/new revision, and audit history after restart and re-login.
4. `Implemented` does not modify or imply requirement approval, criterion verification, evidence state, artifact acceptance, specialist/AI review, stage completion, release readiness, validation, or release.
5. Invalid input, blocked-to-implemented, proposed/approved-to-implemented, stale revision, same-state, post-implemented, unknown target, cross-workspace, unauthorized actor, revoked session, and revoked membership paths fail without partial changes.
6. Identical retry remains idempotent. Changed payload conflicts. Concurrent distinct completion requests against one revision produce one winner.
7. Audit failure rolls back the full completion mutation. Database interruption and recovery preserve the last committed state.
8. Overview guidance excludes implemented work from unfinished current-stage recommendations.
9. TypeScript, production build, security advisor, applicable durable regression suites, keyboard checks, responsive screenshots, and active single-user UI validation pass on the identified build.
10. A validation record identifies the application commit, CI run, executed evidence, screenshots, limits, and remaining work. No `Released` claim is made by this validation.

## Migration and recovery

Use an additive forward migration that expands the allowed work-item and transition status constraints and replaces only the existing work-transition function body needed to authorize `In progress` → `Implemented`.

Existing work rows and history require no backfill. Older application code may not understand `Implemented`, so application rollback after the migration must disable lifecycle mutations until a compatible reader is restored. Prefer a forward fix over destructive data rollback.

## Exclusions

This slice does not implement verification decisions, evidence freshness, multiple acceptance-criterion lifecycle, stage completion, work dependencies, reopen/cancel behavior, collaborator assignment, AI-review provenance, artifact import/version replacement, release authorization, deployment, or production actions.
