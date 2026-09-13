# Increment 2 — Durable criterion evidence

**Status:** Validated  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable workspace, requirement, and acceptance-criterion boundaries  
**Validated application commit:** `4f67d99078600735f086ae894017481234a5a109`  
**Validation:** CI run 151 — `34778920418`; see [validation/increment-2-evidence.md](validation/increment-2-evidence.md)

## 1. Outcome

An authenticated workspace owner can record a durable evidence result against one existing acceptance criterion and see the same evidence after leaving and returning.

This slice creates traceability from requirement to acceptance criterion to evidence. It does not make a verification decision.

## 2. Requirement coverage

This slice advances these approved requirements and first-version commitments:

- `WF-REC-001` — durable project record, specifically evidence records;
- `WF-REC-002` — honest status: evidence must not cause unverified work to appear verified;
- the Project Charter requirement-to-acceptance-criterion-to-evidence link;
- the Project Charter principle that completed work must not appear verified without current evidence.

It does not complete the broader evidence lifecycle, evidence freshness, specialist review, or release-readiness requirements.

## 3. Evidence semantics

The approved glossary defines `evidence` as a recorded result that supports or challenges a requirement, decision, readiness check, or outcome.

For this bounded slice, an evidence record is linked to one acceptance criterion. The recorder states how the result relates to that criterion using one effect:

- `Supports` — the recorded result is consistent with the criterion;
- `Challenges` — the recorded result is inconsistent with the criterion;
- `Inconclusive` — the recorded result does not establish either relationship.

These effects describe the recorded result. They are not criterion status and are not a verification decision.

Recording evidence MUST NOT:

- mark the acceptance criterion satisfied, passed, verified, or validated;
- change the linked requirement from `Approved`;
- mark a work item complete or implemented;
- establish qualified specialist review;
- establish release readiness.

## 4. Evidence record

Each durable evidence record contains:

- immutable evidence identifier;
- workspace identifier;
- release identifier copied from the linked requirement;
- stage number copied from the linked requirement;
- requirement identifier;
- requirement revision captured when the evidence is recorded;
- acceptance-criterion identifier;
- acceptance-criterion revision captured when the evidence is recorded;
- title;
- result;
- source or provenance note;
- effect: `Supports`, `Challenges`, or `Inconclusive`;
- recorder actor identifier derived from the verified session;
- revision;
- created and updated timestamps.

The title is required and limited to 160 characters. The result is required and limited to 4000 characters. The source or provenance note is required and limited to 2000 characters.

Capturing requirement and criterion revisions creates the data needed to identify potentially outdated evidence when accepted project direction changes. This slice does not yet calculate or display an outdated-evidence state.

## 5. Authorization and data authority

PostgreSQL remains authoritative.

Only an authenticated current workspace owner can list or record evidence in this bounded owner-only membership model. The recorder actor is derived from the verified session. The client supplies the workspace and acceptance-criterion identifiers, but the database resolves and validates the linked requirement, release, stage, and revisions.

The acceptance criterion MUST belong to the supplied workspace. A guessed criterion identifier from another workspace or an unknown criterion identifier is rejected.

The caller cannot directly select, insert, update, or delete evidence rows through exposed Data API tables.

## 6. Recording behavior

`RecordCriterionEvidence` takes workspace identifier, acceptance-criterion identifier, title, result, source note, effect, and request key.

One transaction:

1. verifies the current session;
2. verifies current workspace owner membership;
3. resolves the acceptance criterion and its linked approved requirement in the same workspace;
4. captures the requirement release, stage, requirement revision, and criterion revision;
5. validates and trims input;
6. creates one evidence record;
7. records `evidence.recorded` in the audit log;
8. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original evidence identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial evidence, audit event, or retry result.

## 7. Presentation

Evidence appears with the acceptance criterion it references so traceability is visible without cross-referencing identifiers manually.

For each acceptance criterion, the persisted workspace shows:

- recorded evidence count;
- each evidence title;
- result;
- source or provenance note;
- effect with text, not color alone;
- evidence identifier;
- captured requirement and criterion revisions;
- recorder label `Product owner` for this bounded owner-only slice;
- explicit text that recorded evidence does not by itself verify the criterion;
- a form to record another evidence result for that criterion.

The form does not offer a `Verified`, `Passed`, or `Satisfied` state.

## 8. Failure behavior

If evidence recording fails, the application keeps the existing workspace, requirement, criterion, and evidence list unchanged and shows a recoverable error.

A database interruption must not replace durable evidence with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures remain failures.

## 9. Acceptance criteria

1. Owner A records evidence through the application against an existing acceptance criterion. The saved evidence contains the entered title, result, source note, and effect.
2. The database derives the linked requirement, release, stage, requirement revision, criterion revision, and recorder actor from durable state rather than caller-supplied authority data.
3. The rendered evidence shows its effect and explicitly states that recording evidence does not verify the criterion.
4. The linked requirement remains `Approved`; no criterion verification/pass/satisfied state is created or changed.
5. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same evidence identifier and content remain visible.
6. Repeating the same request key with identical input creates one evidence record. Reusing the key with changed input is rejected.
7. An invalid effect is rejected.
8. An unknown criterion identifier or a criterion from another workspace is rejected without creating evidence.
9. Owner B cannot list or create evidence in Owner A's workspace.
10. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected evidence data.
11. An injected failure after evidence insertion rolls back the evidence row, audit event, and retry result.
12. Direct client table read or write access to evidence storage is denied.
13. The database security advisor reports no new error.
14. TypeScript, production build, existing durable workspace, decision, work-item, and requirement acceptance tests, keyboard checks, responsive checks, and rendered screenshots pass.
15. Mobile and desktop rendered review confirms that evidence effect, result, provenance, stable identifier, linked criterion context, and no-verification warning remain readable without horizontal overflow.

All 15 criteria passed in CI run 151 against application commit `4f67d99078600735f086ae894017481234a5a109`.

## 10. Excluded behavior

This slice does not implement:

- criterion pass/fail/satisfied/verified state;
- requirement verification state;
- evidence acceptance or rejection workflow;
- evidence freshness or outdated-evidence calculation;
- evidence supersession or deletion;
- qualified specialist reviewer identity or review authority;
- multiple acceptance criteria per requirement;
- work-item-to-evidence links;
- decision-to-evidence links;
- file uploads, artifact-backed evidence, or external-reference objects;
- automatic CI/CD evidence ingestion;
- automated verification;
- change-impact analysis;
- release readiness or release authorization.

These exclusions keep the slice within the approved owner-only identity model and preserve the distinction between a recorded result and a verification decision.
