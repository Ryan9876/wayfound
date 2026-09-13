# Increment 2 — Durable decision records

**Status:** Validated  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary  
**Validated application commit:** `548f1bbb4264ca412bc808a94a60593bca2c3602` through CI run 92

## 1. Outcome

An authenticated workspace owner can record an approved product-scope or business decision as a durable project record and see the same decision after leaving and returning to the workspace.

The act of saving this record is the owner approval action for this bounded decision type. The stored decision therefore has status `Accepted`.

This slice does not permit Wayfound to accept consequential technical decisions. Those decisions require qualified specialist review under the approved charter and remain outside this slice.

## 2. Requirement coverage

This slice advances these approved requirements:

- `WF-REC-001` — durable project record, specifically decisions;
- `WF-REC-002` — honest status;
- `WF-OWN-001` — product-owner decisions remain distinguishable from specialist review work.

It does not complete the full requirements above. Later slices still need specialist-review records, dependent-work impact, artifacts, evidence, release records, and maintenance records.

## 3. Terminology and authority

The approved glossary defines a `decision` as an approved choice among alternatives or a choice that establishes project direction. Therefore, this slice does not create a record called a decision before approval.

The approved charter gives the product owner authority to approve product scope and business decisions. It requires qualified specialist review for consequential technical decisions.

This slice records only owner-authorized product scope and business decisions. The owner must explicitly confirm that the record is within that authority before save.

A later specialist-review slice must define how consequential technical choices become accepted decisions. This slice does not infer specialist approval from owner input.

## 4. Decision record

Each durable decision contains:

- immutable decision identifier;
- workspace identifier;
- release identifier;
- stage number captured from the workspace current stage at acceptance;
- title;
- decision statement;
- rationale;
- authority value `owner`;
- status `Accepted`;
- accepting owner actor identifier;
- revision;
- created and updated timestamps.

The title is required and is limited to 160 characters. The decision statement is required and is limited to 4000 characters. Rationale is required and is limited to 4000 characters. Input is trimmed before persistence.

## 5. Authorization and data authority

The existing PostgreSQL database remains authoritative.

Only an authenticated current workspace owner can list or create decision records for that workspace. The current membership model exposes only the `owner` role.

A caller cannot select, insert, update, or delete decision rows directly through the exposed Data API. Public RPC wrappers are invoker functions. Privileged transaction code remains in the private `wayfound` schema and derives actor identity from the verified session.

A non-member receives no decision data for a guessed workspace identifier and cannot create a decision there.

## 6. Acceptance behavior

`RecordOwnerDecision` takes workspace identifier, title, decision statement, rationale, authority confirmation, and request key. Workspace, release, stage, and accepting actor come from durable state and the verified session.

One transaction:

1. verifies the current session;
2. verifies current workspace owner membership;
3. requires explicit owner-authority confirmation;
4. resolves the current release and stage;
5. validates input;
6. creates one `Accepted` owner decision;
7. records `decision.accepted` in the audit log;
8. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original decision identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial decision, audit event, or retry result.

## 7. Presentation

The persisted workspace page shows a Decisions section below the problem record.

The section shows:

- the owner authority boundary in plain language;
- an empty state when no decisions exist;
- each accepted decision with title, decision statement, rationale, captured stage, authority, and text status;
- a form for title, decision statement, rationale, and explicit authority confirmation.

The form states that technical decisions requiring qualified specialist review must not be accepted through this action.

The interface does not imply specialist review, verification, or release authorization.

## 8. Failure behavior

If decision creation fails, the application keeps the existing workspace and decision list unchanged and shows a recoverable error.

A database interruption does not replace durable decisions with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures remain failures.

A same-route save defect found in CI run 91 was corrected by revalidating the workspace before redirect. CI run 92 confirmed that a successful save appears immediately and remains durable after restart.

## 9. Acceptance criteria

All acceptance criteria below passed at application commit `548f1bbb4264ca412bc808a94a60593bca2c3602` through CI run 92:

1. Owner A creates a workspace and records one owner-authorized decision through the application. The saved record contains the entered title, decision statement, rationale, authority `owner`, status `Accepted`, current release, and current stage.
2. The action requires explicit confirmation that the choice is a product-scope or business decision within owner authority.
3. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same decision identifier and content remain visible.
4. Repeating the same decision request key with identical input creates one decision. Reusing the key with changed input is rejected.
5. Owner B cannot list or create a decision in Owner A's workspace.
6. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected decision data.
7. An injected failure after decision insertion rolls back the decision, audit event, and retry result.
8. Direct client table read or write access to decision storage is denied.
9. The database security advisor reports no new error.
10. TypeScript, production build, existing durable-workspace acceptance tests, keyboard checks, responsive checks, and rendered screenshots pass.
11. Mobile and desktop rendered review confirms that status and authority are text-visible and the decision form/list do not overflow the viewport.

See [validation/increment-2-decisions.md](validation/increment-2-decisions.md) for executed evidence and limits.

## 10. Excluded behavior

This slice does not implement:

- proposing a technical decision for specialist review;
- specialist approval or rejection;
- editing or deleting a decision;
- superseding or versioning a decision;
- automatic change-impact analysis;
- artifact import or comparison;
- production deployment or release authorization.

These exclusions keep the slice within the current owner authority boundary and prevent unreviewed technical choices from becoming accepted project truth.
