# ADR-0008: M2 PostgreSQL access and migration approach

**Status:** Accepted

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Use `node-postgres` (`pg`) with explicit parameterized SQL and explicit versioned SQL migration files for the M2 durable-project vertical slice. Do not introduce an ORM in M2.

Keep SQL behind Wayfound persistence/application modules. Domain rules remain independent of `pg`, Neon, Next.js request objects, and database row shapes.

## Context

ADR-0007 accepted Next.js + TypeScript, Vercel, Neon PostgreSQL, Clerk, and a Wayfound-owned server authority boundary. It intentionally left the exact SQL access library or ORM open until the first production schema was defined.

M2 has a small but consequential relational surface: projects, Actors/membership, Interview answers and immutable revisions, typed Records/revisions, materialized Artifact revisions, exact trace links, command receipts, and transition metadata. The highest-risk behavior is transactional correctness and revision/traceability semantics rather than query convenience.

## Decision drivers

- Keep transaction boundaries visible during the first persistence slice.
- Use ordinary PostgreSQL semantics that work against Neon and standard development PostgreSQL.
- Avoid coupling domain objects to an ORM while the production schema is still proving itself.
- Make parameterized SQL, locking, optimistic concurrency, immutable revision creation, and exact trace-link writes straightforward to inspect.
- Keep the dependency surface small.
- Preserve the option to adopt a query builder or ORM later if repetitive data-access work becomes material.

## Options considered

### Option A — `pg` + explicit SQL

**Advantages:** direct PostgreSQL semantics; explicit transactions/locks; minimal abstraction; easy to inspect generated behavior.

**Disadvantages:** more handwritten mapping and SQL; schema/query refactors require deliberate maintenance.

### Option B — Type-safe query builder

**Advantages:** stronger compile-time query ergonomics and less row mapping.

**Disadvantages:** another abstraction before M2 has proved the final query surface.

### Option C — Full ORM

**Advantages:** migrations, relationships, and common CRUD can be convenient.

**Disadvantages:** can hide transaction/query behavior that M2 specifically needs to validate; introduces mapping conventions before the revision model is stable.

## Rationale

Option A keeps the first production data path legible. M2 needs to prove that one server command can atomically advance a project version, create immutable revisions, create exact trace links, and write transition metadata. Those invariants are easier to review when their SQL and transaction boundaries are explicit.

This is a bounded implementation decision, not a permanent rejection of ORMs. The persistence module remains an adapter so a future query library can replace `pg` without changing domain rules or API command semantics.

## Consequences

### Positive

- Transactions, `FOR UPDATE` locking, constraints, and revision writes are explicit.
- Development/integration tests can target ordinary PostgreSQL.
- Neon-specific APIs do not become Wayfound domain contracts.
- M2 has no schema-code generation step.

### Negative

- Application code contains more SQL and row mapping.
- Later expansion may justify a type-safe query layer.

## Reversibility

High. The domain/application layer does not expose `pg` objects. A future query builder or ORM can replace the persistence implementation behind the same command/query contracts, with a separate ADR if the change is consequential.

## Validation

M2 must demonstrate:

- parameterized queries for user-controlled values
- explicit transaction commit/rollback behavior
- optimistic version conflicts
- exact current-source revision checks
- immutable revision writes and trace links in the same transaction as authoritative state changes
- migration/rollback scripts reviewed and integration-tested against PostgreSQL before release

## Reconsideration triggers

Revisit this decision if repetitive mapping materially slows delivery, the schema/query surface becomes substantially larger, stronger compile-time SQL typing provides clear value, or maintainability evidence shows handwritten SQL is becoming a risk.

## Related sources

- ADR-0002 — Authoritative project data and persistence model
- ADR-0005 — Application API and AI/tool boundary
- ADR-0007 — Production stack selection
- WF-018 through WF-022 — M2 durable project requirements

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Accepted | Project owner approved proceeding with the recommended Wayfound architecture; M2 persistence work requires this bounded implementation choice |
