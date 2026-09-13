# Increment 2 — Durable owner-approved product requirements

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary

## 1. Outcome

An authenticated workspace owner can record an approved product requirement with one durable acceptance criterion and see the same requirement after leaving and returning.

This slice records only product or business behavior that is within product-owner authority. It does not authorize consequential technical implementation choices. Those choices continue to require qualified specialist review.

## 2. Requirement coverage

This slice advances these approved requirements:

- `WF-REC-001` — durable project record, specifically requirements;
- `WF-OWN-001` — product-owner authority remains distinct from qualified specialist review;
- `WF-REC-002` — acceptance criteria remain distinct from verification evidence.

It also establishes the first durable requirement-to-acceptance-criterion relationship needed for the first-version traceability model. Evidence linking remains later scope.

## 3. Terminology and authority

The approved glossary defines a `requirement` as an approved statement of required product or system behavior. Therefore, this slice does not create a `Proposed` requirement state.

The owner can record only a product requirement that is within product-owner authority. The action requires explicit authority confirmation. A requirement recorded through this action has:

- kind `product`;
- authority `owner`;
- status `Approved`.

A requirement that would approve a consequential technical implementation choice must not use this action. It remains unresolved until the qualified specialist-review workflow exists.

An `acceptance criterion` is an observable condition used to determine whether the requirement is satisfied. It is not a test result and is not verification evidence.

## 4. Requirement record

Each durable requirement contains:

- immutable requirement identifier;
- workspace identifier;
- release identifier;
- stage number captured from the current release at creation;
- title;
- obligation: `MUST`, `SHOULD`, or `MAY`;
- requirement statement;
- kind `product`;
- authority `owner`;
- status `Approved`;
- approving actor identifier derived from the verified session;
- revision;
- created and updated timestamps.

The title is required and limited to 160 characters. The requirement statement is required and limited to 4000 characters.

The immutable UUID is the stable identifier for this bounded slice. A later approved change may add a separate human-readable numbering scheme without changing this identifier.

## 5. Acceptance criterion record

Requirement creation also creates one initial acceptance criterion in the same transaction.

Each acceptance criterion contains:

- immutable criterion identifier;
- requirement identifier;
- workspace identifier;
- criterion statement;
- revision;
- created and updated timestamps.

The criterion statement is required and limited to 4000 characters.

This slice does not create evidence records and does not mark the criterion passed, verified, tested, or satisfied.

## 6. Authorization and data authority

PostgreSQL remains authoritative.

Only an authenticated current workspace owner can list or record requirements through this action. The caller cannot directly select, insert, update, or delete requirement or acceptance-criterion rows through exposed Data API tables.

Public RPC wrappers are invoker functions. Privileged transaction code remains in the private `wayfound` schema, derives actor identity from the verified session, checks current owner membership, and resolves the current release and stage from durable state.

A non-member receives no requirement data for a guessed workspace identifier and cannot create a requirement there.

## 7. Creation behavior

`RecordOwnerRequirement` takes workspace identifier, title, obligation, requirement statement, acceptance criterion, explicit authority confirmation, and request key.

One transaction:

1. verifies the current session;
2. verifies current workspace owner membership;
3. resolves the current release and stage;
4. validates and trims input;
5. creates one `Approved` product requirement under owner authority;
6. creates one linked acceptance criterion;
7. records `requirement.approved` in the audit log;
8. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original requirement identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial requirement, acceptance criterion, audit event, or retry result.

## 8. Presentation

The persisted workspace page shows a Requirements section after Work.

The section shows:

- an empty state when no approved requirements exist;
- each requirement with its stable identifier, title, obligation, statement, authority, status, stage, revision, and acceptance criterion;
- explicit text that the acceptance criterion is not verification evidence;
- a form for title, obligation, requirement statement, and one acceptance criterion;
- a required owner-authority confirmation.

The form states that it is for product or business behavior. It must not imply that a technical implementation choice has received specialist review.

## 9. Failure behavior

If requirement creation fails, the application keeps the existing workspace and requirement list unchanged and shows a recoverable error.

A database interruption must not replace durable requirements with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures remain failures.

## 10. Acceptance criteria

1. Owner A creates a workspace and records one approved product requirement through the application. The saved record contains the entered title, obligation, statement, status `Approved`, kind `product`, authority `owner`, current release, current stage, and Owner A as approving actor.
2. Exactly one linked acceptance criterion is created atomically with the requirement and remains identifiable by its own durable identifier.
3. The rendered requirement shows `Approved` status with text and identifies the acceptance criterion as a condition rather than verification evidence.
4. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same requirement and criterion identifiers and content remain visible.
5. Repeating the same request key with identical input creates one requirement and one criterion. Reusing the key with changed input is rejected.
6. Recording without owner-authority confirmation is rejected.
7. Owner B cannot list or create requirements in Owner A's workspace.
8. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected requirement data.
9. An injected failure after requirement and criterion insertion rolls back the requirement, criterion, audit event, and retry result.
10. Direct client table read or write access to requirement and acceptance-criterion storage is denied.
11. The database security advisor reports no new error.
12. TypeScript, production build, existing durable workspace, decision, and work-item acceptance tests, keyboard checks, responsive checks, and rendered screenshots pass.
13. Mobile and desktop rendered review confirms that the stable identifier, obligation, requirement statement, status, authority, stage, and acceptance criterion remain readable without horizontal overflow.

## 11. Excluded behavior

This slice does not implement:

- proposed or draft requirement records;
- consequential technical requirement approval or specialist review;
- editing, withdrawing, superseding, or deprecating requirements;
- multiple acceptance criteria per requirement;
- criterion status or pass/fail state;
- requirement-to-work links;
- requirement-to-decision links;
- evidence records or criterion-to-evidence links;
- automated verification;
- change-impact analysis;
- artifact import or specialist handoff;
- production deployment or release authorization.

These exclusions keep the slice within the current owner-only identity model while preserving Wayfound's approved requirement and evidence semantics.
