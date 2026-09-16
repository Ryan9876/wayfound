# Increment 2 — Durable work-item dependencies

**Status:** Validated at application/test head `a3484c37199e0072b05eaf5f9979eff6406774b0`, CI run 346

**Parent:** Increment 2 — Durable single-owner workspace record

**Architecture basis:** Accepted ADR-0002 and ADR-0005

**Validation evidence:** [increment-2-work-dependencies.md](validation/increment-2-work-dependencies.md)

## Outcome

The authenticated workspace owner can record that one durable work item depends on another durable work item in the same workspace, see that relationship from both work items, and later remove the active dependency without deleting its history.

This bounded slice advances `WF-REC-001` and establishes the dependency primitive needed by `WF-REC-003`. It implements the work-dependency part of the next active Increment 2 priority in `DELIVERY_PLAN.md`. Broader cross-record links remain later scope.

## Terms

- **Dependent work** — the work item that needs another work item.
- **Prerequisite work** — the work item that the dependent work needs.
- **Active dependency** — a dependency that has not been removed.

If work A depends on work B, A is the dependent work and B is the prerequisite work.

## Dependency semantics

A work dependency is a durable relationship between two stable work-item identities in one workspace.

The owner records:

- dependent work-item ID;
- prerequisite work-item ID;
- the dependent work revision at creation time;
- the prerequisite work revision at creation time;
- a non-empty reason that explains why the dependency exists;
- creating owner actor and creation time.

The relationship follows the stable work-item identities after creation. Later work-item revisions do not silently delete or rewrite the dependency.

A dependency does **not** automatically:

- change either work-item status;
- mark the dependent work `Blocked`;
- start, resume, complete, or reopen work;
- create or satisfy a requirement or acceptance criterion;
- create verification evidence;
- approve a decision or artifact;
- complete or reopen a stage;
- validate or release anything.

The owner must use the existing explicit work lifecycle when a dependency means work should be blocked or resumed.

## Valid dependency rules

An active dependency can be created only when all of these conditions are true:

1. both work items exist in the exact workspace;
2. the dependent and prerequisite work items are different records;
3. no identical active dependency already exists;
4. the new relationship would not create a dependency cycle;
5. the authenticated actor has current explicit `owner` membership;
6. the owner supplies a non-empty reason and explicit confirmation.

Work status does not prevent the relationship from being recorded. Proposed, Approved, In progress, Blocked, and Implemented work may participate in a dependency. This preserves traceability without making dependency existence a hidden lifecycle transition.

## Cycle rule

The active dependency graph must be acyclic.

Before Wayfound creates `A depends on B`, it must reject the request if B already depends directly or indirectly on A.

Dependency-graph mutations for one workspace must serialize strongly enough that concurrent requests cannot create a cycle that neither request observed alone.

A rejected cycle request leaves all existing dependency records unchanged.

## Removal and history

The owner can remove an active dependency after recording:

- a non-empty removal reason;
- explicit confirmation;
- removing owner actor and removal time.

Removal makes the dependency inactive. It does not delete the row or its creation metadata.

Removing a dependency does not change either work item or another project record.

An already removed dependency cannot be removed again through a distinct request. An identical idempotent replay returns the original result.

A later dependency between the same two work items may be created as a new durable record after the earlier dependency was removed.

## Authority and security

The request derives the owner actor from the live authenticated session and current workspace membership.

Caller-supplied actor, release, stage, owner, dependency status, creation time, removal time, or target workspace authority is not trusted.

The database verifies both work items belong to the requested workspace. Cross-workspace and unknown targets fail without creating or changing a dependency.

Direct protected-table writes remain denied.

No AI model, specialist assignment, external tool, or dependency record gains owner authority, verification authority, release authority, or production-changing authority.

## Persistence and idempotency

Dependency creation is transactional and idempotent by owner/request UUID and normalized request payload.

Identical replay returns the original dependency ID. Reusing the request UUID with changed payload fails.

Distinct concurrent attempts to create the same active dependency produce one durable active dependency.

Dependency removal is transactional and idempotent by owner/request UUID and normalized removal payload.

An audit failure rolls back the full create or remove mutation and its request result.

Database interruption must not substitute fixture state or report an unconfirmed mutation as successful.

## User interface

Each work card in the active single-user Work view shows a **Dependencies** section.

For active dependencies, show:

- **Depends on** — prerequisite work title and current status;
- the saved dependency reason;
- a direct link to the prerequisite work card;
- a removal action with required reason and explicit confirmation.

For reverse relationships, show:

- **Needed by** — dependent work title and current status;
- a direct link to the dependent work card.

The add-dependency control:

- lists only other work items in the same workspace;
- requires a reason;
- requires explicit owner confirmation;
- explains that the relationship does not automatically change work status.

The UI must remain usable at desktop and 390 px mobile widths. Dependency state must be conveyed with text, not color alone.

## Acceptance criteria

1. A current authenticated owner can create `A depends on B` only when A and B are distinct work items in the same workspace, with a non-empty reason and explicit confirmation.
2. Creation stores a stable dependency ID, both work IDs, both work revisions at creation time, reason, creating actor, and creation time.
3. The active dependency is visible from A as **Depends on** and from B as **Needed by** with current linked-work status.
4. Creating a dependency does not change either work-item status, revision, transition history, AI-review state, requirement, evidence, artifact, stage, or release state.
5. Self-dependency, unknown target, cross-workspace target, duplicate active dependency, revoked session, revoked membership, and direct protected-table write paths fail without partial state.
6. A dependency request that would create a direct or indirect cycle fails without changing the graph.
7. Concurrent opposite-edge requests cannot create a two-node cycle; exactly one may commit when both start from an acyclic graph.
8. Identical create replay returns the original dependency ID; changed-payload request reuse fails.
9. Distinct concurrent create requests for the same edge produce one active dependency.
10. The current owner can remove one active dependency only with a non-empty reason and explicit confirmation.
11. Removal preserves the dependency row and creation metadata and records removing actor, removal reason, and removal time.
12. Removal does not change either work item or another project record.
13. Identical removal replay returns the original result; changed-payload reuse and distinct removal of an already inactive dependency fail without partial state.
14. Injected audit failure rolls back create/removal state and idempotent request results.
15. Restart and re-login preserve active and removed dependency history.
16. TypeScript, production build, security advisor, prior durable regressions, focused dependency persistence/security/concurrency tests, keyboard checks, responsive screenshots, and active single-user UI validation pass on the identified build.
17. A validation record identifies the application commit, CI run, executed evidence, screenshots, limits, and remaining scope. No `Validated` claim is made before those checks pass.

## Migration and recovery

Use an additive migration.

Application rollback may leave dependency records unreadable by older code. During rollback, disable incompatible dependency mutations and retain the database rows. Prefer a forward fix over destructive dependency-table rollback.

No existing work item requires a backfill because absence of a dependency record means no dependency has been recorded.

## Exclusions

This slice does not implement:

- generic links between requirements, decisions, evidence, artifacts, AI reviews, or other record types;
- automatic work blocking or resuming from dependency state;
- dependency satisfaction or readiness calculations;
- automatic impact propagation after a work, decision, or artifact change;
- accepted technical-decision replacement/supersession;
- technical-requirement replacement/withdrawal/supersession/deprecation;
- multiple acceptance-criterion lifecycle;
- evidence freshness or verification decisions;
- stage completion, release readiness, deployment, or production-changing actions.
