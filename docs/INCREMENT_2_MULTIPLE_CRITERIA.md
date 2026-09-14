# Increment 2 — Additional product acceptance criteria

**Status:** Validated at application/test head `21d2afdec3a7880656c84e77b2753e2d9d80d871`, CI run 375  
**Validation:** [validation/increment-2-multiple-criteria.md](validation/increment-2-multiple-criteria.md)  
**Basis:** Approved multiple acceptance-criterion priority; WF-REC-001, WF-REC-002, WF-OWN-001, WF-AI-002; ADR-0002 and ADR-0005.

## Outcome and bounded scope

The current owner can add an observable condition to an existing Approved product requirement. The new condition uses the existing acceptance_criteria table and exact-criterion evidence flow. This is the first additive slice of multiple-criterion lifecycle, not completion of editing, withdrawal, supersession, technical multi-criterion proposals, freshness, or verification.

No new authority model is introduced. Technical requirements reject this owner-only command. Their exact reviewed proposal/criterion and split approval authority remain unchanged. Historical specialist capabilities remain preserved and hidden in active single-user mode.

## Existing-model inspection

- Schema: acceptance_criteria already has a many-to-one requirement foreign key; no unique requirement constraint restricts it to one row.
- Read RPC and domain: list_requirements aggregates an ordered collection; RequirementRecord already exposes acceptance_criteria[].
- Product creation: record_owner_requirement, CreateRequirementInput, and creation form deliberately create one initial criterion atomically. Preserve that contract and its validated assertions.
- Technical creation/revision, assignment snapshots, review and approval all contain one proposed criterion. Preserve these exact-revision contracts; do not mutate approved technical conditions through owner authority.
- Evidence: record_criterion_evidence resolves an exact criterion and snapshots requirement/criterion revisions. Existing evidence must never be reparented or rewritten.
- Both guided and historical requirement readers iterate criteria. Add the owner control only to the active guided product surface. Existing evidence controls remain scoped by criterion identity.
- Existing tests assert one initial criterion. Those assertions remain correct; add focused coverage for later additions rather than weaken them.
- Architecture describes one initial criterion and future multiple-criterion lifecycle. This extension must be documented separately from historical validated scope.

## Command and transaction

AddOwnerCriterion takes workspace, requirement, expected requirement revision, statement (trimmed, 1–4000 characters), reason (trimmed, 1–2000 characters), explicit owner confirmation, and request UUID. The database derives actor and authority from the live session and membership.

Lock current owner membership and the requirement. Require kind product, authority owner, status Approved. Resolve exact replay after authorization and locking, before revision comparison. Changed-payload request reuse fails. A distinct stale request fails; concurrent requests for the same revision have one winner. Reject an identical trimmed existing condition without altering it.

Atomically insert one criterion at revision 1, increment requirement revision once, preserve an immutable addition record (actor, reason, old/new requirement revision, criterion identity, time), audit criterion.added, and store the idempotent result. Failure rolls back all parts.

Existing criteria, requirement statement/approval, evidence and their saved snapshots remain unchanged. Evidence recorded afterward continues to capture the database requirement revision and exact criterion revision. Addition does not calculate freshness or imply evidence applies to other criteria.

## Presentation

Keep the add form closed until requested. Show the condition, required reason and owner confirmation. Explain that adding a condition does not mean it passed. List every criterion with its own evidence, identifier and revision. Show addition reason and saved requirement revision range. Use full IDs for form controls. Recoverable errors retain entered details; success refreshes the requirement view.

## Acceptance coverage and validation gate

1. Add a second and third condition to one product requirement; stable identities persist through restart and re-login.
2. Initial creation still creates exactly one criterion. Existing criterion/evidence rows and snapshots are byte-for-byte unchanged by addition; new evidence remains attached only to its exact criterion.
3. Technical requirement, foreign/unknown target, anonymous/expired/revoked session, foreign owner, revoked membership and direct-table operations are denied.
4. Empty/oversized input, absent confirmation, duplicate condition, stale revision and changed replay fail.
5. Exact concurrent replay returns one identity; distinct same-revision additions produce one winner.
6. Injected audit failure rolls back criterion, revision, addition history and request result; identical retry succeeds after recovery.
7. No work, decision, artifact, release, stage, approval, verification or AI authority changes.
8. Browser creation, failure retention, keyboard/focus, unique IDs and desktop/390 px overflow checks pass. Inspect actual screenshots before UI validation.
9. Full existing CI regression chain, TypeScript, production build and database security checks pass at an identified application head. Record validation and reconcile project records, then require green exact reconciliation-head CI.

Acceptance criteria 1–8 and the application-head portion of criterion 9 passed at `21d2afdec3a7880656c84e77b2753e2d9d80d871` through CI run 375. The desktop and 390 px screenshots from artifact `10371314321` were directly inspected. Repository-wide reconciliation still requires green CI on the exact reconciliation head before the final status update is complete.

## Recovery and limits

The migration is additive and requires no backfill or destructive conversion. Existing readers already render collections. Disable the new mutation if rollback is needed; retain committed criteria, addition history and evidence. Prefer a forward fix. No criterion edit/delete or requirement replacement path is introduced. No production action or release authority is granted.
