# ADR-0006: Deployment, migrations, and rollback baseline

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Deploy Wayfound initially as one production application boundary plus one authoritative relational project store, with environment-separated configuration and secrets.

Use immutable application build identities, explicit schema migrations, backward-compatible migration sequencing where practical, and a documented rollback path for every release that changes authoritative behavior or data shape.

Do not make database rollback depend on reversing destructive migrations. Prefer expand-and-contract schema changes so the previous and new application versions can overlap safely during deployment and rollback windows.

The exact hosting platform, database product, CI/CD provider, migration tool, and observability vendor remain separate implementation choices.

## Context

ADR-0001 proposes a browser client, server-side authoritative application/API, and relational project store. ADR-0002 defines revision-aware durable state. ADR-0003 defines identity/authorization. ADR-0004 defines privacy/retention boundaries. ADR-0005 defines a modular-monolith API and server-side integration adapters.

The current prototype is static and has no production deployment risk. Once Wayfound stores authoritative project state, releases can affect user access, permissions, revisions, migrations, and traceability. Deployment therefore becomes part of product correctness rather than an infrastructure afterthought.

Wayfound also needs to remain maintainable by people who did not build the original system. Releases should have identifiable artifacts, explicit migrations, understandable health checks, and rollback procedures that do not depend on tribal knowledge.

## Decision drivers

- Keep the first production topology operationally simple.
- Make every deployed version identifiable.
- Protect authoritative data during application rollback.
- Avoid irreversible schema changes during ordinary releases where possible.
- Keep secrets/configuration out of source and browser code.
- Separate production data from development/test data.
- Support deterministic validation before promotion.
- Keep external AI/tool providers optional so their failure does not prevent core rollback/recovery.
- Make migration and rollback responsibility explicit.
- Preserve a path to more advanced deployment patterns only when evidence justifies them.

## Initial deployment topology

The initial production-capable topology should remain one logical application deployment plus one relational project store.

```text
Browser
   │ HTTPS
   ▼
Wayfound application/API
   │
   ├─ authoritative project store
   │
   ├─ identity provider adapter
   │
   └─ optional external AI/tool adapters
```

Static browser assets may be served by the application or a CDN/edge layer. That does not change the application/API authority boundary.

Do not introduce microservices, service mesh, distributed database, or multiple independently deployed domain services unless scale/security/ownership evidence requires them.

## Environments

Define at least these logical environments before production launch:

### Local/development

Purpose:

- developer work
- unit/component tests
- schema iteration

Must not use production credentials or production project data by default.

### Preview/test

Purpose:

- integration testing
- migration validation
- browser/end-to-end testing
- release-candidate verification

Uses isolated non-production data/credentials.

### Production

Purpose:

- authoritative user projects

Requires production identity, secrets, storage, backups, monitoring, and release controls.

Additional staging environments are optional and should be added only if they improve release assurance enough to justify the cost.

## Build identity

Every deployable application build must have an immutable build identifier that can be correlated with:

- source commit/revision
- deployment time
- schema/migration version expected by the build
- application version/release identifier
- relevant feature/configuration version where practical

The running service should expose build identity through a diagnostics/health surface that does not leak secrets.

Audit/operational records should make it possible to determine which build handled a consequential request when that information matters for investigation.

## Configuration and secrets

Environment-specific configuration is supplied outside source code.

Rules:

- no production secrets in browser-delivered assets
- no production secrets committed to repository source
- identity, database, AI, and tool credentials stay server-side
- secrets are scoped per environment
- secret rotation must not require rewriting project records
- non-secret feature configuration is versioned/documented where it can change behavior materially

The exact secret manager remains a platform decision.

## Database migrations

All authoritative schema changes use explicit versioned migrations committed with the application change that requires them.

A release must know which migrations it requires and whether the database is compatible with the currently deployed and rollback application versions.

### Expand-and-contract pattern

Prefer this sequence for breaking schema evolution:

1. **Expand** — add new nullable columns/tables/indexes/contracts without removing old ones.
2. Deploy code that can work with the expanded schema.
3. Backfill/transform data through an observable, restartable process if needed.
4. Switch reads/writes to the new representation after validation.
5. **Contract** — remove old structures only in a later release after rollback compatibility is no longer needed.

This reduces the chance that an application rollback fails because the prior version can no longer understand the database.

## Destructive migrations

Do not combine destructive/irreversible schema changes casually with application deployment.

Examples requiring explicit release review include:

- dropping content-bearing columns/tables
- changing identifier semantics
- rewriting revision lineage
- deleting audit/transition history
- changing authorization ownership relationships

A destructive migration must define:

- backup/restore point
- data-loss implications
- migration validation
- forward-fix strategy
- whether application rollback remains possible
- required maintenance window if applicable

## Backfills and long-running migrations

Large data transformations should run as explicit jobs rather than blocking application startup indefinitely.

A backfill should be:

- restartable/idempotent where practical
- observable
- resumable after failure
- bounded by project/data scope
- safe to run while compatible application versions are active

The application must define behavior for partially backfilled state before the job starts.

## Application deployment

Use immutable deployments/builds rather than modifying a running production artifact in place.

The deployment system should support:

- build artifact creation from a specific source revision
- release-candidate validation
- promotion to production
- health verification after deployment
- rollback to a prior compatible application build

Blue/green, rolling, or other rollout mechanics remain a hosting-platform choice.

## Health model

Define separate health concepts where the selected platform supports them:

### Process/liveness

Can the application process run/respond?

### Readiness

Can the application safely accept authoritative requests?

Readiness can depend on required resources such as:

- compatible database schema
- database connectivity
- essential configuration
- identity validation dependencies if required for protected requests

External AI/tool providers should generally **not** make core application readiness fail when the core project workflow can operate without them. Their status belongs in dependency/degraded-health reporting.

## Release gate

A production release that changes authoritative behavior or data shape must have evidence for, as applicable:

- source/build identity
- automated test results
- browser/end-to-end validation for affected user flows
- migration validation against representative data
- authorization/security regression checks for affected commands
- backup/restore readiness for risky data changes
- release notes / affected requirement or ADR references
- rollback or forward-fix plan
- known risks and accepted exceptions

No release is declared successful solely because the deployment platform reports that a process started.

## Rollback model

### Application-only rollback

If the schema remains backward compatible, restore the previous known-good application build and verify health/critical flows.

### Application + incompatible schema

Avoid this condition through expand-and-contract. If unavoidable, the release must define one of:

- database restore to a known-good point with accepted data-loss window
- tested reverse migration when genuinely safe
- forward-fix deployment when rollback would be more dangerous

Do not assume every migration is safely reversible.

### Configuration rollback

Material configuration changes must be versioned or otherwise reproducible so a previous known-good configuration can be restored.

### External integration rollback

AI/tool adapter changes should be disableable independently where practical through configuration/feature control so an integration regression does not require database rollback.

## Backup and restore

Before production persistence is accepted, the selected data platform must define:

- backup method
- backup frequency/continuous-recovery capability
- retention period
- encryption/access controls
- restore procedure
- restore validation procedure
- relationship to project deletion/purge policy

Numeric recovery objectives remain TBD until product/business requirements define them. Do not invent an RPO/RTO simply because a platform offers one.

Backups count as stored user data and must participate in ADR-0004 retention/deletion design.

## Feature controls

Use feature/configuration controls for changes that need safe rollout or fast disablement, especially:

- external AI providers
- external tool integrations
- new generation/routing logic
- migrations that require staged application behavior

A feature flag is not an authorization control and must not replace server permission checks.

Flags that materially affect project semantics should be recorded/versioned sufficiently to diagnose historical behavior.

## Observability

Production observability should include, at minimum conceptually:

- structured application errors
- request/correlation IDs
- deployment/build identity
- database/migration failures
- external dependency health
- authoritative command failure categories
- background job/backfill state when applicable

Follow ADR-0004: ordinary logs should not contain free-form project content by default.

Audit transition records are domain history; operational logs are diagnostics. Do not treat one as a substitute for the other.

## Incident/recovery boundary

Operational procedures should distinguish:

- application outage
- database outage
- identity-provider outage
- external AI/tool outage
- bad deployment
- bad migration/data corruption
- security/authorization incident

Each can require a different recovery path. The first production runbook can be small, but it must identify owner/action for these classes before release.

## Options considered

### Option A — Deploy in place and run migrations automatically at startup

**Summary:** New application instances modify the schema during startup and replace the running code directly.

**Advantages:**

- Simple pipeline.
- Minimal release tooling.

**Disadvantages:**

- Startup can become a migration control plane.
- Multiple instances can race migrations.
- Long/destructive migrations make health/rollback unpredictable.
- Previous builds may become incompatible immediately.

**Risks:**

- A failed startup migration can take the application and data path down simultaneously.

### Option B — Platform-specific serverless/data architecture from the start

**Summary:** Select a hosting platform's preferred deployment/database/functions primitives and build around them.

**Advantages:**

- Can provide excellent managed deployment and scaling.
- Low infrastructure management burden.

**Disadvantages:**

- Couples the architecture proposal to a vendor before cost/operational evaluation.
- Rollback/migration behavior becomes shaped by platform-specific assumptions.

**Risks:**

- Provider convenience becomes an accidental domain/release architecture.

### Option C — Immutable application builds + explicit migrations + compatibility window

**Summary:** Keep one modular application deployment, versioned database migrations, build identity, expand/contract schema evolution, and explicit release/rollback gates.

**Advantages:**

- Understandable operational model.
- Protects rollback compatibility.
- Vendor-neutral enough to evaluate hosting options later.
- Makes migrations and release evidence explicit.
- Fits Wayfound's traceability philosophy.

**Disadvantages:**

- Requires disciplined release engineering.
- Some schema changes take multiple releases.
- Backfill tooling may be needed as data grows.

**Risks:**

- Teams can bypass the compatibility discipline if migrations are not reviewed/tested.

## Rationale

Option C gives Wayfound a production-worthy release boundary without selecting more infrastructure than the product needs.

The most important rollback property is not a fancy deployment strategy; it is maintaining compatibility between application versions and the authoritative schema long enough to recover safely. Expand-and-contract migrations and immutable build identities make that property explicit.

Starting as one modular application also keeps diagnosis and ownership straightforward. External AI/tool integrations can be independently disabled while core projects remain available, reducing the chance that an optional provider becomes a release-critical dependency.

## Consequences

### Positive

- Every production deployment can be tied to a source/build identity.
- Application rollback remains practical across ordinary schema evolution.
- Migrations become reviewable, testable artifacts.
- External AI/tool problems can be isolated from core project availability.
- Production/debug evidence aligns with Wayfound's traceability principles.

### Negative

- Release engineering becomes a real project responsibility.
- Some migrations require multiple phases/releases.
- Backups/restores and migration tests add operational work.
- A platform cannot be chosen solely for developer convenience; it must satisfy rollback/data requirements.

### Neutral or accepted constraints

- Hosting/database/CI vendor choices remain open.
- Numeric uptime, RPO, RTO, and deployment-time targets remain TBD.
- The first production topology remains a modular monolith plus relational store.
- Advanced multi-region/high-availability architecture is not selected without evidence that the product needs it.

## Reversibility

Changing hosting providers is moderate if build/configuration, database migrations, and application contracts remain provider-independent.

Changing database vendors is more expensive but manageable if schema/domain logic avoids unnecessary proprietary features.

Moving from a modular monolith to services is possible later. Moving from uncontrolled in-place deployments or irreversible migrations to disciplined rollback after significant production data accumulates is harder, which is why the release baseline is set now.

## Validation

Before this ADR can move from Proposed to Accepted, validate the selected production implementation can demonstrate:

1. every deployment has an immutable build/source identity
2. development/test environments cannot accidentally use production credentials/data by default
3. a schema migration can be applied in preview/test before production
4. one representative schema change follows expand-and-contract and allows application rollback
5. a stale/incompatible schema causes readiness failure instead of unsafe request handling
6. previous application build can be restored when schema remains compatible
7. backup and restore procedure is documented and testable for the selected database platform
8. external AI/tool adapter can be disabled while core project read/write remains available
9. logs expose build/correlation/error metadata without routine free-form project content
10. a release record identifies requirements/ADRs, validation evidence, migration state, and rollback plan

## Reconsideration triggers

Revisit this decision if:

- Wayfound becomes purely local/offline and no hosted authoritative service exists
- measured load or availability requirements justify multi-region or multi-service deployment
- selected hosting/database platform requires a materially different safe migration model
- product requirements define strict numeric recovery/availability targets that the baseline cannot satisfy
- independent service ownership/security boundaries justify distributed deployment

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- ADR-0003 — Identity and project authorization boundary
- ADR-0004 — Privacy, retention, and age boundary
- ADR-0005 — Application command API and AI/tool boundary
- Architecture section: Deployment and environments; Reliability and failure model; Observability
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial deployment, migration, and rollback baseline for production-capable Wayfound |
