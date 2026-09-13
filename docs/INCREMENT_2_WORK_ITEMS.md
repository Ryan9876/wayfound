# Increment 2 — Durable proposed work items

**Status:** Validated  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary  
**Validated application commit:** `1f2a1c99856119c845a4495b61674bea415a4a77` through CI run 113

## 1. Outcome

An authenticated workspace owner can record a bounded proposed work item in the durable project workspace and see the same work item after leaving and returning.

This slice records planned work without claiming that execution started, implementation completed, specialist review occurred, or verification passed. New work items therefore start with status `Proposed`.

## 2. Requirement coverage

This slice advances these approved requirements:

- `WF-REC-001` — durable project record, specifically work;
- `WF-REC-002` — honest status;
- `WF-OWN-001` — ownership remains explicit and specialist review is not implied.

It does not complete the requirements above. Later slices still need work-state transitions, collaborator/specialist assignment, dependencies, requirements, artifacts, evidence, release records, maintenance records, and change-impact handling.

## 3. Terminology and authority

The approved glossary defines a `work item` as a bounded unit of planned delivery work. A work item is not a requirement, acceptance criterion, decision, or evidence record.

The current authenticated membership model exposes only the workspace `owner` role. Therefore, this bounded slice assigns each new work item to the authenticated owner who records it. It does not create free-text assignees or imply that an unmodeled collaborator or specialist accepted responsibility.

A proposed work item can describe specialist work, but its existence does not count as specialist review or specialist acceptance.

## 4. Work-item record

Each durable work item contains:

- immutable work-item identifier;
- workspace identifier;
- release identifier;
- stage number captured from the workspace current stage at creation;
- title;
- outcome;
- completion condition;
- expected evidence description;
- owner actor identifier derived from the verified session;
- status `Proposed`;
- revision;
- created and updated timestamps.

The title is required and is limited to 160 characters. Outcome, completion condition, and expected evidence are required and are each limited to 4000 characters. Input is trimmed before persistence.

## 5. Authorization and data authority

PostgreSQL remains authoritative.

Only an authenticated current workspace owner can list or create work items for that workspace. The caller cannot select, insert, update, or delete work-item rows directly through the exposed Data API.

Public RPC wrappers are invoker functions. Privileged transaction code remains in the private `wayfound` schema, derives actor identity from the verified session, checks current membership, and resolves the current release and stage from durable state.

A non-member receives no work-item data for a guessed workspace identifier and cannot create work there.

## 6. Creation behavior

`CreateProposedWorkItem` takes workspace identifier, title, outcome, completion condition, expected evidence, and request key.

One transaction:

1. verifies the current session;
2. verifies current workspace owner membership;
3. resolves the current release and stage;
4. validates and trims input;
5. creates one `Proposed` work item owned by the current actor;
6. records `work_item.proposed` in the audit log;
7. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original work-item identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial work item, audit event, or retry result.

## 7. Presentation

The persisted workspace page shows a Work section after Decisions.

The section shows:

- an empty state when no work items exist;
- each work item with title, outcome, owner, current-stage capture, completion condition, expected evidence, revision, and text status;
- a form for title, outcome, completion condition, and expected evidence.

The interface states that saving creates proposed work only. It does not imply that execution started, that a specialist accepted the work, or that verification occurred.

## 8. Failure behavior

If work-item creation fails, the application keeps the existing workspace and work-item list unchanged and shows a recoverable error.

A database interruption does not replace durable work with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures remain failures.

## 9. Acceptance criteria

All acceptance criteria below passed at application commit `1f2a1c99856119c845a4495b61674bea415a4a77` through CI run 113:

1. Owner A creates a workspace and records one proposed work item through the application. The saved record contains the entered title, outcome, completion condition, expected evidence, status `Proposed`, current release, current stage, and Owner A as the owner actor.
2. The rendered work item shows status with text and does not claim `In progress`, `Implemented`, `Validated`, specialist review, or verification.
3. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same work-item identifier and content remain visible.
4. Repeating the same request key with identical input creates one work item. Reusing the key with changed input is rejected.
5. Owner B cannot list or create work in Owner A's workspace.
6. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected work-item data.
7. An injected failure after work-item insertion rolls back the work item, audit event, and retry result.
8. Direct client table read or write access to work-item storage is denied.
9. The database security advisor reports no new error.
10. TypeScript, production build, existing durable-workspace and decision acceptance tests, keyboard checks, responsive checks, and rendered screenshots pass.
11. Mobile and desktop rendered review confirms that the work-item record and form do not overflow the viewport and that owner, stage, status, completion condition, and expected evidence remain readable.

See [validation/increment-2-work-items.md](validation/increment-2-work-items.md) for executed evidence and limits.

## 10. Excluded behavior

This slice does not implement:

- changing a work item from `Proposed` to another status;
- starting, blocking, completing, implementing, or validating work;
- editing, deleting, or superseding a work item;
- assigning work to collaborators or specialists;
- work-item dependencies or sequencing;
- linking work to requirements or accepted decisions;
- attaching or accepting evidence;
- automatic change-impact analysis;
- artifact import or specialist handoff;
- production deployment or release authorization.

These exclusions keep the slice inside the current identity and authorization boundary and preserve honest status while the durable record model expands.
