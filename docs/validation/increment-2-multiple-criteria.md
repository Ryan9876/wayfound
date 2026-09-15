# Increment 2 additional product acceptance criteria validation

**Status:** Validated application/test slice

**Validated application/test head:** `21d2afdec3a7880656c84e77b2753e2d9d80d871`

**CI run:** 375 (`34902672658`)

**Requirement basis:** `WF-REC-001`, `WF-REC-002`, `WF-OWN-001`, `WF-AI-002`

**Slice:** [INCREMENT_2_MULTIPLE_CRITERIA.md](../INCREMENT_2_MULTIPLE_CRITERIA.md)

## Validated outcome

The current authenticated workspace owner can add additional observable conditions to an existing `Approved` product requirement. Initial requirement creation still creates exactly one acceptance criterion. Each later criterion has its own stable identity and revision, preserves its addition reason and requirement revision range, and continues to use the existing exact-criterion evidence model.

Adding a criterion does not mark that condition passed, satisfied, verified, or validated. Existing criteria and evidence remain attached to their original identities and retain their saved snapshots. The owner-only command rejects technical requirements so it cannot bypass the exact specialist-reviewed technical-requirement authority path.

This slice validates additive product criteria only. It does not complete the broader acceptance-criterion lifecycle.

## CI evidence

CI run 375 completed successfully on exact application/test head `21d2afdec3a7880656c84e77b2753e2d9d80d871`.

Both `validate` and `durable-workspace` jobs passed. The run included:

- prototype, accessibility, single-user-mode, local-AI, and workspace-guidance contract checks;
- TypeScript and optimized production builds;
- keyboard navigation and responsive UI screenshot capture;
- isolated local Supabase startup and the complete migration set, including `20260914215033_additional_product_criteria.sql`;
- database security checks;
- focused additional-product-criteria validation;
- the complete prior durable workspace, evidence, artifact, artifact-acceptance, specialist-review, work-lifecycle/completion, AI-review, dependency, project-direction-link, technical-decision, and technical-requirement regression chain; and
- automatic single-user owner-session/UI validation after the isolated database reset.

The focused suite reported:

> PASS: multiple product criteria; exact evidence and revision preservation; owner/tenant/session/revocation gates; idempotency, concurrency, audit rollback/retry; persistence; browser failure retention, keyboard, unique IDs and desktop/390 px rendering.

## Focused behavior exercised

The focused suite confirms:

- initial product-requirement creation still creates exactly one criterion;
- a second and third condition can be added to an existing approved product requirement;
- stable criterion identities persist through application restart and sign-out/sign-in;
- adding a criterion increments the requirement revision once and stores immutable addition history;
- existing criterion rows and evidence records remain unchanged when a later condition is added;
- evidence recorded after the change snapshots the current requirement revision and the exact criterion revision;
- evidence remains linked only to its exact acceptance criterion;
- technical requirements reject the owner-only additional-criterion command;
- unknown, foreign-workspace, foreign-owner, anonymous, expired-session, revoked-session, and revoked-membership operations are denied;
- protected criterion-addition tables reject direct client reads and writes;
- empty or oversized input, missing confirmation, duplicate conditions, stale revisions, and changed request replay fail;
- identical concurrent request replay returns one criterion identity;
- distinct same-revision additions serialize so one request succeeds and the stale request fails;
- injected audit failure rolls back the criterion, requirement revision, addition history, audit event, and idempotent request result, and an identical retry succeeds after recovery;
- work, decision, artifact, release, stage, technical-approval, verification, and AI-authority state remain unchanged;
- browser validation preserves entered detail after a recoverable error;
- keyboard focus moves from the disclosure control to the first field in the opened add form;
- duplicate DOM IDs are absent; and
- desktop and 390 px layouts have no horizontal overflow.

Runs before 375 exposed test-harness synchronization problems while exercising the new browser flow. Commit `21d2afdec3a7880656c84e77b2753e2d9d80d871` waits for the committed criterion redirect and then asserts against the persisted criterion element. Run 375 then passed the focused gate and all prior regressions. This change strengthens browser-state synchronization; it does not reduce the saved-state assertion.

## Rendered evidence

The `workspace-screenshots` artifact from run 375 is:

- **Artifact ID:** `10371314321`
- **Size:** `34,681,076` bytes
- **GitHub SHA-256:** `e170e7ee3f12dba61051959e47515220c152408ee28ec2e0effd56de66f2a195`
- **Files inspected directly:** `multiple-criteria-desktop.png` and `multiple-criteria-mobile.png`

Direct visual inspection confirmed:

- the existing condition and the added condition remain separate records;
- each condition exposes its own evidence section and details;
- saved addition reason and requirement revision range are visible for the later condition;
- the add-criterion form states that adding a condition does not mean it passed;
- the owner confirmation states the product/business authority boundary and does not imply technical approval or verification;
- desktop layout remains readable and aligned with the current workspace design;
- the 390 px mobile layout remains readable without horizontal overflow; and
- the interface does not label either criterion verified, validated, released, or otherwise complete because of criterion creation or evidence presence.

The same artifact contains prior durable and active single-user UI screenshots generated by the exact run.

## Authority and data boundary verified

The database derives the actor from the live authenticated session, verifies current owner membership, locks the requirement, and requires the stored requirement to be an `Approved` product requirement with owner authority. The browser supplies the expected requirement revision, condition, reason, confirmation, and request UUID; it does not supply authoritative actor, requirement kind, approval state, or addition history.

A successful addition atomically inserts one acceptance criterion at revision 1, increments the requirement revision once, stores immutable addition history, records `criterion.added`, and stores the idempotent request result. Existing criteria, requirement approval, evidence, and prior evidence snapshots are not rewritten.

Adding a product criterion does not:

- approve a consequential technical requirement or technical choice;
- create or change work state;
- create evidence for the new condition;
- mark any criterion satisfied or verified;
- establish stage completion or validation;
- create release readiness or release authorization; or
- authorize deployment or another production-changing action.

## Limits and remaining scope

This validation does **not** claim implementation of:

- editing or deleting an acceptance criterion;
- criterion withdrawal, replacement, supersession, or deprecation;
- multiple acceptance criteria inside the technical-requirement proposal/review/approval path;
- evidence freshness or outdated-state handling after requirement or criterion changes;
- explicit criterion verification decisions;
- automatic test-evidence ingestion;
- requirement-to-work or evidence-to-work traceability beyond the currently validated relationships;
- release readiness, release authorization, deployment, or production-changing actions.

Existing evidence does not automatically become fresh, stale, applicable, or inapplicable because another criterion was added. Later evidence-freshness work must make that state explicit.

## Recovery

The migration is additive and requires no data backfill or destructive conversion. If rollback is required, disable the new owner criterion mutation and keep committed criteria, addition history, and evidence. Prefer a forward fix rather than deleting durable records.

## Validation conclusion

The bounded additional product acceptance criteria slice is **Validated** at application/test head `21d2afdec3a7880656c84e77b2753e2d9d80d871` through CI run 375 and direct rendered-evidence review. Increment 2 as a whole remains **In progress**.

Project-record reconciliation must still pass CI on the exact reconciliation head before the repository-wide status update is final. No Released or production-readiness state is claimed.
