# Increment 2 product acceptance-criterion withdrawal validation

**Status:** Validated application/test slice

**Validated application/test head:** `8e6c267ae737689691f313999c0f792786954a71`

**CI run:** 383 (`34910661431`)

**Requirement basis:** `WF-REC-001`, `WF-REC-002`, `WF-OWN-001`, `WF-AI-002`; ADR-0002 and ADR-0005

**Slice:** [INCREMENT_2_CRITERION_WITHDRAWAL.md](../INCREMENT_2_CRITERION_WITHDRAWAL.md)

## Validated outcome

The current authenticated workspace owner can withdraw one active acceptance criterion from an existing `Approved` product requirement without deleting the criterion, its statement, its addition history, or its evidence. A withdrawn criterion remains a durable historical condition with lifecycle `Withdrawn`; its criterion revision and parent requirement revision advance exactly once for the withdrawal.

Withdrawal is product-scope lifecycle management, not verification. It does not claim that prior evidence is invalid, stale, disproved, verified, or no longer historically relevant. The owner-only withdrawal path rejects technical requirements and an approved product requirement must retain at least one active condition.

New evidence is denied for a withdrawn criterion. Evidence committed before withdrawal remains linked to the same criterion identity with its original requirement/criterion revision snapshots, and exact replay of an already committed evidence request remains idempotent after live authorization.

This slice validates withdrawal only. Criterion text revision, reactivation, supersession/replacement, evidence freshness/outdated-state handling, explicit verification decisions, and technical multi-criterion lifecycle remain future scope.

## CI evidence

CI run 383 completed successfully on exact application/test head `8e6c267ae737689691f313999c0f792786954a71`.

Both `validate` and `durable-workspace` jobs passed. The run included:

- prototype, accessibility, single-user-mode, local-AI, and workspace-guidance contract checks;
- TypeScript and optimized production builds;
- keyboard navigation and responsive screenshot capture;
- isolated local Supabase startup and the complete migration set, including `20260914230000_criterion_withdrawal.sql`;
- database security checks;
- the existing additional-product-criteria regression suite plus focused criterion-withdrawal validation;
- the complete prior durable workspace, evidence, artifact, artifact-acceptance, specialist-review, work-lifecycle/completion, AI-review, dependency, project-direction-link, technical-decision, and technical-requirement regression chain; and
- automatic single-user owner-session/UI validation after the isolated database reset.

The focused suite reported:

> PASS: owner product criterion withdrawal preserves criterion/evidence history; blocks last-active and technical withdrawal; denies new evidence; enforces tenant/session/revocation/direct-table boundaries; preserves idempotency, concurrency and audit rollback/retry; persists through restart/re-login; and renders text lifecycle status without desktop/390 px overflow.

The existing additional-product-criteria suite also passed in the same run, confirming that criterion addition remains intact.

## Focused behavior exercised

The focused validation confirms:

- a product requirement with multiple active conditions can have one condition withdrawn;
- withdrawal preserves the stable criterion ID, statement, earlier addition metadata, and prior evidence rows;
- the withdrawn criterion advances from revision 1 to revision 2 while the parent requirement revision advances once;
- the requirement retains at least one active condition and withdrawal of the only active condition is rejected;
- recording new evidence for a withdrawn criterion is rejected;
- evidence committed before withdrawal remains durable and exact request replay remains idempotent after live authorization;
- technical requirements reject the owner-only withdrawal path;
- unknown/foreign targets, foreign owner, revoked membership, anonymous/expired/revoked sessions, and direct protected-table operations are denied;
- empty/oversized reason, missing authority confirmation, stale requirement or criterion revision, already-withdrawn target, and changed request replay fail;
- identical concurrent replay resolves to one withdrawal identity;
- distinct same-revision mutations serialize through the requirement boundary so one wins and the stale request fails;
- injected audit failure rolls back criterion lifecycle/revision, requirement revision, withdrawal history, audit event, and idempotent request state; identical retry succeeds after recovery;
- decision, work, artifact, stage, release, verification, AI authority, and production authority state remain unchanged;
- a recoverable browser validation error retains the owner-entered withdrawal context;
- the management disclosure is keyboard reachable and remounts after a successful revision change so stale form state is not retained;
- duplicate DOM IDs are absent; and
- desktop and 390 px layouts have no horizontal overflow.

Runs 380 and 381 exposed test/UI synchronization issues while exercising the new flow. Run 380 identified an existing selector collision introduced by repeating canonical criterion text in the management surface. Run 381 then reached the successful withdrawal but exposed stale disclosure state across the server refresh. Those issues were corrected without weakening persisted-state assertions. Run 382 passed the full data/browser suite, but direct visual inspection found that the canonical criterion card still offered **Add evidence** for a withdrawn condition even though the database correctly rejected it. Application head `8e6c267ae737689691f313999c0f792786954a71` removes that unusable action and makes the lifecycle state explicit; run 383 passed all gates.

## Rendered evidence

The `workspace-screenshots` artifact from run 383 is:

- **Artifact ID:** `10374313444`
- **Size:** `35,143,133` bytes
- **GitHub SHA-256:** `0fb6684711ab605a7a1148c558f683839e38c2546e571a6d564cdcb8a98b6baf`
- **Files inspected directly:** `criterion-withdrawal-desktop.png` and `criterion-withdrawal-mobile.png`

Direct visual inspection confirmed:

- the active criterion is labeled `Active` and retains the **Add evidence** control;
- the withdrawn criterion is labeled `Withdrawn` and remains visible with its existing evidence count;
- the withdrawn criterion no longer exposes an **Add evidence** action;
- the canonical criterion card states that existing evidence remains historical and that new evidence cannot be recorded for the withdrawn condition;
- the management history shows the withdrawal reason plus requirement and criterion revision transitions;
- the management copy states that withdrawal is not a verification decision;
- desktop layout remains readable and aligned with the existing Records surface;
- the 390 px mobile layout remains readable without horizontal overflow; and
- the interface does not label the withdrawn criterion verified, failed, validated, released, or otherwise complete because of withdrawal or evidence presence.

## Authority and transaction boundary verified

The database derives the actor from the live authenticated session, checks current owner membership, locks the requirement and criterion, requires an `Approved` product requirement with owner authority, verifies exact expected requirement and criterion revisions, and confirms that another active criterion will remain.

A successful withdrawal atomically changes lifecycle to `Withdrawn`, increments the criterion revision once, increments the requirement revision once, stores immutable withdrawal history, records `criterion.withdrawn`, and stores the idempotent request result. Failure rolls back all parts.

The evidence mutation takes the compatible locked boundary so evidence and withdrawal cannot race into an impossible state: evidence either commits before withdrawal and remains historical, or withdrawal wins first and the new evidence request is rejected.

Withdrawal does not:

- edit or delete the criterion statement;
- erase or rewrite prior evidence;
- establish evidence freshness or staleness;
- mark a criterion passed, failed, satisfied, verified, invalid, or superseded;
- approve consequential technical behavior;
- change work, artifact, decision, stage, or release state;
- establish validation or release readiness; or
- authorize deployment or another production-changing action.

## Recovery and remaining scope

The migration is additive. Existing criteria were introduced to the lifecycle model as `Active` without changing stable identities or historical evidence. If application rollback is required, disable the withdrawal mutation and retain lifecycle/history data for a forward fix; do not delete withdrawal history or reset withdrawn criteria to active as a rollback shortcut.

Remaining acceptance-criterion lifecycle includes criterion text revision/change semantics, reactivation, replacement/supersession/deprecation where approved, and any future technical multi-criterion design. Evidence freshness/outdated-state handling and explicit verification decisions remain separate follow-on work.

## Validation conclusion

The bounded product acceptance-criterion withdrawal slice is **Validated** at application/test head `8e6c267ae737689691f313999c0f792786954a71` through CI run 383 and direct rendered-evidence inspection. Increment 2 as a whole remains **In progress**.

Project-record reconciliation must still pass CI on the exact reconciliation head before the repository-wide status update is final. No Released or production-readiness state is claimed.
