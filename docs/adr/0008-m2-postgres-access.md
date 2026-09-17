# ADR-0008: Optional PostgreSQL adapter access and migration approach

**Status:** Accepted

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

When Wayfound uses the optional PostgreSQL persistence adapter, use `node-postgres` (`pg`) with explicit parameterized SQL and explicit versioned SQL migration files. Do not introduce an ORM for this bounded adapter yet.

Keep SQL behind Wayfound persistence/application modules. Domain rules remain independent of `pg`, Neon, Next.js request objects, and database row shapes.

ADR-0009 supersedes the earlier interpretation that PostgreSQL is the default M2 store. The default M2 persistence path is local SQLite. This ADR remains authoritative only for the optional PostgreSQL/hosted compatibility adapter.

## Context

ADR-0007 originally selected Next.js + TypeScript, Vercel, Neon PostgreSQL, Clerk, and a Wayfound-owned server authority boundary. Under that hosted-first interpretation, M2 needed a concrete PostgreSQL access strategy.

ADR-0009 later corrected the runtime to local-first: local SQLite and a stable local Actor are now the default M2 authority adapters, while PostgreSQL/Neon and Clerk remain optional hosted-mode adapters.

The PostgreSQL compatibility implementation still has a small but consequential relational surface: projects, Actors/membership, Interview answers and immutable revisions, typed Records/revisions, materialized Artifact revisions, exact trace links, command receipts, and transition metadata. The highest-risk behavior is transactional correctness and revision/traceability semantics rather than query convenience.

## Decision drivers

- Keep PostgreSQL transaction boundaries visible and inspectable.
- Use ordinary PostgreSQL semantics that work against Neon and standard PostgreSQL.
- Avoid coupling domain objects to an ORM.
- Make parameterized SQL, locking, optimistic concurrency, immutable revision creation, and exact trace-link writes straightforward to inspect.
- Keep the optional hosted dependency surface small.
- Preserve the option to adopt a query builder or ORM later if repetitive data-access work becomes material.
- Ensure PostgreSQL remains an adapter and does not redefine local-first domain semantics.

## Options considered

### Option A — `pg` + explicit SQL

**Advantages:** direct PostgreSQL semantics; explicit transactions/locks; minimal abstraction; easy to inspect generated behavior.

**Disadvantages:** more handwritten mapping and SQL; schema/query refactors require deliberate maintenance.

### Option B — Type-safe query builder

**Advantages:** stronger compile-time query ergonomics and less row mapping.

**Disadvantages:** another abstraction before the hosted query surface has demonstrated enough complexity to justify it.

### Option C — Full ORM

**Advantages:** migrations, relationships, and common CRUD can be convenient.

**Disadvantages:** can hide transaction/query behavior that the revision model specifically needs to validate; introduces mapping conventions before the hosted adapter is a committed product dependency.

## Rationale

Option A keeps the optional PostgreSQL data path legible. The adapter must preserve the same Wayfound invariants as local SQLite: one authoritative command can atomically advance a project version, create immutable revisions, create exact trace links, and write transition metadata.

Those invariants are easier to review when PostgreSQL SQL and transaction boundaries are explicit.

This is a bounded adapter decision, not a permanent rejection of ORMs. The persistence module remains an adapter so a future query library can replace `pg` without changing domain rules or API command semantics.

## Consequences

### Positive

- Transactions, `FOR UPDATE` locking, constraints, and revision writes are explicit.
- Compatibility tests can target ordinary PostgreSQL.
- Neon-specific APIs do not become Wayfound domain contracts.
- Hosted compatibility has no schema-code generation step.
- Local Wayfound remains unaffected if PostgreSQL/Neon is unavailable.

### Negative

- PostgreSQL adapter code contains more SQL and row mapping.
- Maintaining both SQLite and PostgreSQL adapters creates drift risk.
- Later hosted expansion may justify a type-safe query layer.

## Reversibility

High. The domain/application layer does not expose `pg` objects. A future query builder or ORM can replace the PostgreSQL persistence implementation behind the same command/query contracts, with a separate ADR if the change is consequential.

The entire PostgreSQL adapter can also remain disabled without affecting default local operation.

## Validation

The optional PostgreSQL compatibility path must demonstrate:

- parameterized queries for user-controlled values
- explicit transaction commit/rollback behavior
- optimistic version conflicts
- exact current-source revision checks
- immutable revision writes and trace links in the same transaction as authoritative state changes
- versioned migration/rollback behavior against PostgreSQL
- the same Artifact lifecycle boundary as local mode, with no M2 `approved` state

These checks are compatibility evidence. They are not prerequisites for local M2 validation under ADR-0009.

## Reconsideration triggers

Revisit this decision if repetitive mapping materially slows hosted-mode delivery, the PostgreSQL query surface becomes substantially larger, stronger compile-time SQL typing provides clear value, maintainability evidence shows handwritten SQL is becoming a risk, or hosted/team mode chooses a different persistence architecture entirely.

## Related sources

- ADR-0002 — Authoritative project data and persistence model
- ADR-0005 — Application API and AI/tool boundary
- ADR-0007 — Historical hosted-first production stack selection
- ADR-0009 — Current local-first runtime decision
- WF-017 through WF-022 — Local-first M2 durable project requirements

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Accepted | Selected `pg` + explicit SQL for the then-current hosted-first M2 implementation path |
| 2026-09-17 | Accepted | ADR-0009 narrowed this ADR to the optional PostgreSQL/hosted compatibility adapter; SQLite became the default local M2 store |
