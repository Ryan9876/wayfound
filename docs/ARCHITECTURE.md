# Wayfound Architecture

**Status:** Approved foundation; implementation is incremental

## 1. Architecture decision

Wayfound uses a web application architecture based on Next.js App Router, React, TypeScript, and a relational PostgreSQL data model.

The foundation prototype deliberately uses local fixture data for the illustrative Borrow Desk routes. This keeps product-learning work reversible while the interface and record model are validated.

Increment 2 introduces authenticated PostgreSQL-backed workspace identity and continuity through a bounded create/open/resume slice. Durable artifact storage, artifact versioning, dependency-aware evidence handling, and other later record types remain future vertical slices. The prototype fixture layer must not become an accidental persistent data source.

## 2. Current prototype boundary

The current implementation contains:

- a responsive application shell;
- the approved Wayfound visual tokens;
- desktop and mobile primary navigation;
- a Borrow Desk overview scenario;
- the canonical 15-stage journey;
- representative Work, Handoffs, Records, and Release & Care views;
- fixture-backed foundation routes with no persistent writes;
- authenticated create/list/open/resume workspace routes backed by PostgreSQL for the first Increment 2 slice.

The foundation routes retain fixtures. The Increment 2 routes add server-side authentication and PostgreSQL create/open/resume through scoped RPCs. Durable artifact storage, external specialist connectors, automatic CI/CD evidence ingestion, production-changing actions, and production release authorization remain unimplemented.

## 3. Target component boundaries

### Presentation

Next.js App Router and React render the workspace. Interactive components should use client-side JavaScript only where interaction requires it.

### Application logic

Server-side application functions enforce implemented workspace scope and authorization. Later slices will add artifact lifecycle, versioning, reconciliation, impact review, and release rules as those behaviors enter approved scope.

### Persistence

PostgreSQL is the authoritative application data store for the implemented durable workspace state. Artifact storage may use object storage when file size or immutability requirements justify it.

### AI guidance

AI guidance is advisory. Generated recommendations and drafts remain distinguishable from accepted project records. AI output must not authorize production actions or silently alter accepted scope.

### External tools

The first version uses explicit manual handoff packages and returned-file reconciliation. Verified direct connectors are later scope.

## 4. Data authority

For implemented persistent state:

- the Wayfound database owns structured durable workspace state;
- an accepted artifact version will remain authoritative until an authorized acceptance action selects a later version when artifact versioning is implemented;
- failed imports must remain failure records and must not replace accepted artifacts when import behavior is implemented;
- external tool output is input to reconciliation, not automatic project truth;
- chat history is not a project data source.

## 5. Security and authorization

The implemented durable-workspace slice uses authenticated users, workspace-scoped membership checks, row-level access policies, scoped RPCs, server-side session verification, and no application service key. Direct exposed-table writes are denied for the bounded slice.

The broader production architecture must also provide explicit ownership and reviewer roles, validation at file and external-input boundaries, no committed secrets, audit records for material acceptance and authorization events, and clear separation between recommendations and authorized actions.

Security design that changes trust boundaries or introduces consequential dependencies requires an Architecture Decision Record.

## 6. Failure behavior

Material workflows must preserve the last accepted or committed project state when a proposed operation fails.

Examples:

- durable workspace creation is transactional and leaves no partial record after an injected failure;
- database interruption renders a recoverable error and does not substitute fixture data for a durable workspace;
- failed imports preserve accepted artifacts;
- failed reconciliation does not partially accept returned work;
- an interrupted release action must not be reported as successful without outcome evidence;
- unknown dependency impact remains unresolved rather than becoming “no impact.”

The current persistence adapter uses a bounded retry only for PostgREST error `PGRST303` with the exact message `JWT issued at future`. Other persistence and authorization failures are not converted to success. Acceptance tests require the intended denial result for protected-data checks.

## 7. Observability

Important failures must be diagnosable. Production implementation must identify the workspace, operation, actor or external source, record version, outcome, and correlation context without logging secrets or unnecessary sensitive data.

The first durable-workspace transaction records a scoped audit event and correlation context. Later observability work must extend this baseline without exposing authentication material.

## 8. Deployment and rollback

The foundation prototype can use preview deployment without persistent operational data.

The durable-workspace slice has been validated against isolated local Supabase in CI. No hosted persistence project or production data deployment is established by that validation.

Before production data exists, Wayfound must define repeatable deployment and rollback behavior for the chosen hosting and persistence services. Recovery claims require executed restore evidence.

## 9. Technology baseline

The prototype source currently targets:

- Next.js 16.3.x App Router;
- React 19.3.x;
- TypeScript 7.0.x;
- Tailwind CSS 4.3.x;
- Lucide React for interface icons.

These versions remain implementation details within the approved Next.js 14+ architecture family. Dependency versions should be reviewed during each release rather than treated as permanent product requirements.

## 10. Reconsideration triggers

Revisit the architecture when validated product behavior cannot be represented cleanly by the current record model, persistence or file-volume needs materially exceed the planned model, direct integrations enter approved scope, AI or external actions gain authority beyond drafting and recommendations, or security/privacy/availability/regulatory requirements materially change.

## 11. Increment 2 implementation

[ADR-0002](adr/0002-durable-workspace-identity.md) was accepted following Ryan Smith's development-slice approval on 2026-09-13. Presentation uses `app/sign-in` and `app/workspaces`. `lib/application` validates input and authenticates the actor. `lib/auth` owns Supabase identity access. `lib/persistence` owns bounded database calls. `lib/domain` contains the shared journey catalog and input contract, with no provider or fixture dependency.

The private `wayfound` schema owns workspace state. Privileged creation is a single scoped transaction behind invoker RPC wrappers; no direct client table writes or application service keys are permitted. Reads verify current provider session and membership. New workspaces have Stage 1 active and a Proposed release, with no evidence or completion claims. AI is not connected.

The bounded create/open/resume slice is **Validated** at application commit `603f02862ae4090bd1853157e449a01508186f4c` through CI run 70. The [validation record](validation/increment-2-durable-workspace.md) covers authentication, atomic creation, retry behavior, tenant isolation, revocation, rollback, restart/resume, database interruption/recovery, keyboard focus, responsive rendering, and the Supabase database security advisor. No hosted project or production deployment exists. Broader Increment 2 remains In progress for later approved entities and workflows.
