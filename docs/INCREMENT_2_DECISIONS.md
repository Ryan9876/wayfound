# Increment 2 — Durable decision records

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary

## 1. Outcome

An authenticated workspace owner can record a project decision as a durable `Proposed` record and see the same decision after leaving and returning to the workspace.

This slice extends project continuity without adding decision acceptance, change-impact analysis, artifact versioning, or specialist handoff behavior.

## 2. Requirement coverage

This slice advances these approved requirements:

- `WF-REC-001` — durable project record, specifically decisions;
- `WF-REC-002` — honest status;
- `WF-OWN-001` — product-owner decisions remain distinguishable from specialist review work.

It does not complete the full requirements above. Later slices still need accepted-decision behavior, specialist-review records, dependent-work impact, artifacts, evidence, release records, and maintenance records.

## 3. Decision record

Each durable decision contains:

- immutable decision identifier;
- workspace identifier;
- release identifier;
- stage number captured from the workspace current stage at creation;
- title;
- decision statement;
- rationale;
- status;
- author actor identifier;
- revision;
- created and updated timestamps.

A newly created decision has status `Proposed`. The first slice exposes no mutation that changes a decision to `Accepted`. `Accepted` remains a reserved lifecycle value because the approved requirements refer to accepted decisions, but no acceptance claim is made by this slice.

The title is required and is limited to 160 characters. The decision statement is required and is limited to 4000 characters. Rationale is required and is limited to 4000 characters. Input is trimmed before persistence.

## 4. Authorization and data authority

The existing PostgreSQL database remains authoritative.

Only an authenticated current workspace member can list or create decision records for that workspace. The current membership model exposes only the `owner` role, so this is equivalent to owner-only access in this slice.

A caller cannot select, insert, update, or delete decision rows directly through the exposed Data API. Public RPC wrappers are invoker functions. Privileged transaction code remains in the private `wayfound` schema and derives actor identity from the verified session.

A non-member receives no decision data for a guessed workspace identifier.

## 5. Creation behavior

`CreateDecision` takes workspace identifier, title, decision statement, rationale, and request key. Workspace, release, stage, and actor authority come from durable state and the verified session.

One transaction:

1. verifies the current session;
2. verifies current workspace membership;
3. resolves the current release and stage;
4. validates input;
5. creates one `Proposed` decision;
6. records `decision.created` in the audit log;
7. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original decision identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial decision, audit event, or retry result.

## 6. Presentation

The persisted workspace page shows a Decisions section below the problem record.

The section shows:

- a clear statement that new decisions are `Proposed`;
- an empty state when no decisions exist;
- each saved decision with title, decision statement, rationale, captured stage, and text status;
- a form for title, decision statement, and rationale.

The interface must not imply that a proposed decision was reviewed, verified, or accepted.

## 7. Failure behavior

If decision creation fails, the application keeps the existing workspace and decision list unchanged and shows a recoverable error.

A database interruption must not replace durable decisions with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures must remain failures.

## 8. Acceptance criteria

1. Owner A creates a workspace and creates one decision through the application. The saved record contains the entered title, decision statement, rationale, `Proposed` status, current release, and current stage.
2. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same decision identifier and content remain visible.
3. Repeating the same decision request key with identical input creates one decision. Reusing the key with changed input is rejected.
4. Owner B cannot list or create a decision in Owner A's workspace.
5. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected decision data.
6. An injected failure after decision insertion rolls back the decision, audit event, and retry result.
7. Direct client table read or write access to decision storage is denied.
8. The database security advisor reports no new error.
9. TypeScript, production build, existing durable-workspace acceptance tests, keyboard checks, responsive checks, and rendered screenshots pass.
10. Mobile and desktop rendered review confirms that status is text-visible and the decision form/list do not overflow the viewport.

## 9. Excluded behavior

This slice does not implement:

- accepting or rejecting a proposed decision;
- editing or deleting a decision;
- superseding or versioning a decision;
- automatic change-impact analysis;
- linking specialist review to a decision;
- artifact import or comparison;
- production deployment or release authorization.

These exclusions keep the slice reversible and prevent unvalidated lifecycle behavior from becoming project truth.
