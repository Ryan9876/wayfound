# Wayfound Architecture

**Status:** Approved foundation; implementation is incremental

## 1. Architecture decision

Wayfound uses a web application architecture based on Next.js App Router, React, TypeScript, and a relational PostgreSQL data model.

The first prototype slice deliberately uses local fixture data. This keeps product-learning work reversible while the interface and record model are validated.

Persistent data, authentication, artifact versioning, and dependency-aware evidence handling enter later vertical slices. The prototype fixture layer must not become an accidental production data source.

## 2. Current prototype boundary

The current implementation contains:

- a responsive application shell;
- the approved Wayfound visual tokens;
- desktop and mobile primary navigation;
- a Borrow Desk overview scenario;
- the canonical 15-stage journey;
- representative Work, Handoffs, Records, and Release & Care views;
- fixture data with no production writes.

The current implementation does not contain authentication, a database connection, durable artifact storage, external specialist connectors, automatic CI/CD evidence ingestion, production-changing actions, or a production authorization mechanism.

## 3. Target component boundaries

### Presentation

Next.js App Router and React render the workspace. Interactive components should use client-side JavaScript only where interaction requires it.

### Application logic

Server-side application functions will enforce workspace scope, artifact lifecycle, authorization, versioning, reconciliation, impact review, and release rules.

### Persistence

PostgreSQL will become the authoritative application data store for structured workspace records. Artifact storage may use object storage when file size or immutability requirements justify it.

### AI guidance

AI guidance is advisory. Generated recommendations and drafts remain distinguishable from accepted project records. AI output must not authorize production actions or silently alter accepted scope.

### External tools

The first version uses explicit manual handoff packages and returned-file reconciliation. Verified direct connectors are later scope.

## 4. Data authority

When persistence is implemented:

- the Wayfound database owns structured workspace state;
- an accepted artifact version remains authoritative until an authorized acceptance action selects a later version;
- failed imports remain failure records and do not replace accepted artifacts;
- external tool output is input to reconciliation, not automatic project truth;
- chat history is not a project data source.

## 5. Security and authorization

The production architecture must provide authenticated users, workspace-scoped authorization, explicit ownership and reviewer roles, validation at file and external-input boundaries, no committed secrets, audit records for material acceptance and authorization events, and clear separation between recommendations and authorized actions.

Security design that changes trust boundaries or introduces consequential dependencies requires an Architecture Decision Record.

## 6. Failure behavior

Material workflows must preserve the last accepted project state when a proposed operation fails.

Examples:

- failed imports preserve accepted artifacts;
- failed reconciliation does not partially accept returned work;
- an interrupted release action must not be reported as successful without outcome evidence;
- unknown dependency impact remains unresolved rather than becoming “no impact.”

## 7. Observability

Important failures must be diagnosable. Production implementation must identify the workspace, operation, actor or external source, record version, outcome, and correlation context without logging secrets or unnecessary sensitive data.

## 8. Deployment and rollback

The prototype can use preview deployment without persistent operational data.

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

## 11. Increment 2 preparation

[ADR-0002](adr/0002-durable-workspace-identity.md) proposes the identity trust boundary and managed provider. It is not accepted. The [first-slice model](INCREMENT_2_SLICE.md) defines create/open/resume, workspace membership, transactions, audit, demo separation, and failure tests before fixture replacement. Authentication and persistence implementation remain Blocked on that decision.
