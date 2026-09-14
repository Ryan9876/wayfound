# Increment 2 — Product acceptance-criterion withdrawal

**Status:** In progress  
**Basis:** Approved remaining acceptance-criterion lifecycle priority; WF-REC-001, WF-REC-002, WF-OWN-001, WF-AI-002; ADR-0002 and ADR-0005.

## Outcome and bounded scope

The current owner can withdraw one active acceptance criterion from an existing `Approved` product requirement without deleting the criterion or its evidence. Withdrawal records that the condition is no longer active project direction for that requirement. It does not claim that earlier evidence is invalid, stale, verified, or disproved.

This slice does not edit criterion text, reactivate a withdrawn criterion, withdraw technical criteria, calculate evidence freshness, make a verification decision, or change requirement approval state.

## Invariants

- A criterion has lifecycle `Active` or `Withdrawn`.
- Existing criteria migrate as `Active` without changing identity or revision.
- Only a current authenticated owner can withdraw a criterion from an `Approved` product requirement with owner authority.
- Technical requirements reject the owner-only withdrawal command.
- An approved product requirement must retain at least one active acceptance criterion.
- Withdrawal preserves the criterion identity, statement, prior evidence, addition history, and all evidence revision snapshots.
- Withdrawal increments the criterion revision once and the parent requirement revision once.
- New evidence cannot be recorded against a withdrawn criterion. Exact replay of evidence that was already committed before withdrawal may still return its existing evidence identity after live authorization.
- Withdrawal does not mark a criterion passed, failed, verified, invalid, outdated, or superseded.

## Command and transaction

`WithdrawOwnerCriterion` takes workspace, requirement, criterion, expected requirement revision, expected criterion revision, reason, explicit owner confirmation, and request UUID.

The database derives the actor from the live session and current owner membership. The transaction locks the requirement and criterion, requires product/owner/Approved authority, checks both expected revisions, requires the criterion to be active, and confirms at least one other active criterion will remain.

Exact request replay is resolved only after live authorization and target locking. Changed-payload reuse fails. Distinct stale requests fail. Concurrent withdrawals against the same requirement revision serialize through the requirement lock.

A successful transaction:

1. changes the criterion lifecycle to `Withdrawn`;
2. increments the criterion revision once;
3. increments the requirement revision once;
4. saves immutable withdrawal history with actor, reason, old/new requirement revision, old/new criterion revision, and time;
5. records `criterion.withdrawn` in the audit log; and
6. stores the idempotent request result.

Failure rolls back all parts.

## Presentation

The active guided Records surface exposes **Manage acceptance criteria** for owner product requirements. It lists every criterion with text lifecycle status. Active criteria can be withdrawn only when another active condition will remain. A withdrawal requires a reason and explicit owner confirmation.

Withdrawn criteria remain visible in management history with their reason and revision transition. The interface states that existing evidence remains historical and that withdrawal is not a verification decision.

## Acceptance coverage and validation gate

1. Withdraw one condition from a product requirement that has at least two active criteria; the stable criterion identity persists with lifecycle `Withdrawn` and incremented criterion/requirement revisions.
2. Existing evidence, evidence revision snapshots, criterion statement, and addition history remain unchanged.
3. Recording new evidence against the withdrawn criterion is denied; exact replay of evidence committed before withdrawal remains idempotent after live authorization.
4. Withdrawal of the only active criterion is denied without changing any record.
5. Technical requirement, foreign/unknown target, foreign owner, revoked membership, anonymous/expired/revoked session, and direct protected-table operations are denied.
6. Empty/oversized reason, absent confirmation, stale requirement revision, stale criterion revision, already-withdrawn target, and changed replay fail.
7. Exact concurrent replay returns one withdrawal identity; distinct same-revision withdrawals produce one winner and one stale loser.
8. Injected audit failure rolls back criterion lifecycle/revision, requirement revision, withdrawal history, and request result; identical retry succeeds after recovery.
9. No decision, work, artifact, stage, release, verification, AI authority, or production authority changes.
10. Browser withdrawal, error retention, keyboard reachability, text lifecycle status, unique IDs, desktop/390 px overflow checks, restart, and re-login persistence pass. Actual screenshots must be inspected before UI validation.
11. Full existing CI regression chain, TypeScript, production build, and database security checks pass at an identified application head. Record validation and reconcile project records, then require green exact reconciliation-head CI.

## Recovery and limits

The migration is additive. Existing criteria receive lifecycle `Active`; no historical row is deleted or rewritten. If application rollback is required, disable the withdrawal mutation and retain lifecycle/history data for a forward fix. Do not drop withdrawal history or reset withdrawn criteria to active as a rollback shortcut.

Criterion text revision, reactivation, supersession, evidence freshness/outdated-state handling, explicit verification decisions, and technical multi-criterion lifecycle remain future scope. No production action or release authority is introduced.