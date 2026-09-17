# Wayfound Architecture

**Status:** Approved production baseline; implementation pending

## Purpose

This file describes the approved technical structure of Wayfound. It records system boundaries, major components, interfaces, data authority, operational behavior, and technical constraints.

Use an Architecture Decision Record (ADR) for consequential decisions that explain why the architecture has a specific form.

## 1. Architecture summary

Wayfound has two intentionally distinct architectural states during the transition to production.

### Validated prototype

The current validated Interview / Records / Draft-artifact experience is a dependency-free static browser application. It keeps temporary state in the browser and has no production server, persistent project store, hosted identity, or external AI dependency.

### Accepted production target

The accepted production architecture is a modular Next.js + TypeScript application deployed on Vercel, with server-side Wayfound domain/application code acting as the only authoritative transition boundary, Neon PostgreSQL holding durable relational project state, and Clerk authenticating users.

Wayfound owns project authorization, lifecycle rules, revisions, traceability, and approval semantics. Clerk proves identity; it does not own Wayfound project authority. Neon stores the project model; it does not define domain transitions. Vercel hosts application builds; a deployment does not itself constitute a Wayfound release approval.

External AI and tool providers, when introduced, execute through server-side adapters and remain non-authoritative.

ADR-0007 is the acceptance record for the M1 architecture package described by ADR-0001 through ADR-0006.

## 2. System context

### Users and external actors

Wayfound supports users with varied technical experience and project types, including games, hobby projects, school projects, business applications, internal tools, and technical systems.

Production actors include:

- human users authenticated through the configured identity provider
- internal Wayfound Actors mapped from external identities
- future service or AI Actors that are explicitly distinguished from humans and do not receive approval authority by default

### External systems

Accepted production dependencies are:

- Vercel — application deployment and preview environments
- Neon — hosted PostgreSQL
- Clerk — authentication / external identity

Future AI providers and external tools are optional adapter dependencies and are not required for the first hosted production slice.

### Trust boundaries

Production trust boundaries are:

1. browser ↔ Wayfound server/application boundary
2. Wayfound server ↔ Clerk identity service
3. Wayfound server ↔ Neon PostgreSQL
4. later: Wayfound server ↔ external AI/tool providers

Secrets, provider credentials, consequential authorization, and authoritative lifecycle transitions remain server-side.

## 3. Major components

| Component | Responsibility | Owns | Depends on | Failure effect |
| --- | --- | --- | --- | --- |
| Wayfound shell | Navigation, layout, brand styling, and page framing | Presentation only | Browser / Next.js UI | Page layout or navigation is degraded |
| Interview renderer | Prompts, choices, recommendations, progress, and summary | Current rendered view | Interview model | User cannot complete guided flow |
| Idea classifier | Detects broad routing signals | Routing hints only | Interview/domain logic | Questions may be less relevant |
| Question registry / selector | Defines and selects applicable questions | Interview question policy | Interview state | Required decisions can be skipped or unnecessary questions shown |
| Interview domain model | Answers, history, applicability, derived state, progress, completion | Domain semantics | Server/client domain modules as appropriate | Decisions or derived state become incorrect |
| Record projector | Projects accepted Interview state into typed trace records | Derived trace view | Interview domain model | Traceability becomes incomplete or misleading |
| Draft artifact projector | Produces draft brief/Journey/requirement/work candidates | Derived previews | Current Records | Suggested next artifacts become incomplete or misleading |
| Artifact review model | Draft / Proposed / Set aside review semantics | Review disposition semantics | Draft artifacts | Stale or misleading proposal state can persist |
| Next.js server/application boundary | HTTP handling, commands, authorization orchestration, transactions | Authoritative write path | Clerk adapter, domain modules, persistence adapter | Authoritative mutations unavailable |
| Wayfound domain/application layer | Lifecycle rules, concurrency checks, authorization checks, traceability, command semantics | Authoritative project rules | PostgreSQL adapter, identity adapter | Project state could become invalid if bypassed |
| Clerk identity adapter | Maps authenticated external identity to Wayfound Actor | Identity mapping only | Clerk | Authenticated actions unavailable |
| Wayfound authorization model | Project membership, roles/capabilities, approval authority | Project authorization truth | Wayfound Actor + project state | Protected actions may be denied or unsafe if incorrect |
| Persistence adapter | Reads/writes relational current state, revisions, trace links, transition metadata | Persistence contract | Neon PostgreSQL | Durable project state unavailable |
| AI/tool adapters | Encapsulate optional external model/tool calls | Provider integration only | External providers | Suggestions/integrations unavailable; project authority remains intact |

The production implementation starts as one deployable modular application boundary. Do not split into microservices until measured scale, isolation, or operational requirements justify it.

## 4. Data model and authority

### Prototype authority

The current validated static prototype keeps state in browser memory. That state remains valid as prototype/demo state only and is not the production system of record.

### Production authority

The Wayfound application/API is the only writer of authoritative project state.

The accepted persistence model uses:

- normalized current logical objects
- immutable content revisions
- exact revision-to-revision trace links
- append-only transition/audit metadata
- optimistic concurrency for consequential writes
- relational transactions that commit authoritative state, revision, trace, and required transition metadata together

Core logical objects include:

- Project
- Interview Run
- Answer + Answer Revision
- Record + Record Revision
- Artifact + Artifact Revision
- Trace Link
- State Transition
- Actor and project membership/capability records

Generated previews are not authoritative and are not persisted by default. A candidate becomes durable only after an explicit user disposition such as Propose or Set aside. A future approval must target an exact immutable Artifact Revision.

Changing upstream source content must not silently preserve a stale proposal or approval against different content.

Full event sourcing is not the initial persistence model. Current normalized state plus immutable revisions and a transition ledger provide the required traceability with less operational and privacy complexity.

## 5. Interfaces and contracts

### Browser/application contract

Use versioned HTTP/JSON reads and explicit domain commands for consequential writes.

Examples of domain commands include:

- CreateProject
- AcceptInterviewAnswer
- ProposeArtifact
- SetAsideArtifact
- ReturnArtifactToDraft
- future ApproveArtifact / RejectArtifact / SupersedeArtifact

Consequential commands should include an expected version/revision or equivalent concurrency token and an idempotency key where retry duplication would be harmful.

Clients do not write privileged lifecycle fields directly. A browser request equivalent to `status = approved` is invalid unless it is expressed as an authorized domain command that passes server-side rules.

### Internal module boundaries

Keep presentation, route/request handling, application commands/queries, domain rules, authorization, persistence, identity, and AI/tool adapters separate even though they live in one Next.js deployment initially.

Domain logic should not require Next.js-specific request/page objects to express project rules.

## 6. Security architecture

- Clerk authenticates external users.
- Wayfound maps authenticated identities to internal Actors.
- Wayfound owns project membership, roles/capabilities, and approval authority.
- Human approval requires an identified human Actor with the required project capability.
- AI/service Actors do not receive approval, membership-management, or destructive project authority by default.
- Secrets and provider credentials stay server-side.
- Consequential writes must be authorized in the Wayfound application boundary.

Projects are private by default for the first hosted slice.

Ordinary telemetry/logs must not copy unrestricted project free text. Privacy, retention, deletion, consent, and younger-user eligibility requirements gate storage of real hosted content.

## 7. Reliability and failure model

Production behavior must include:

- stale writes rejected through optimistic concurrency instead of silent last-write-wins
- consequential state changes committed transactionally
- failed transitions not recorded as successful audit events
- provider failures isolated so loss of an optional AI/tool provider does not corrupt authoritative project state
- explicit database migration and rollback procedures
- backup/restore validation before production release

Specific numeric SLO/RPO/RTO targets remain TBD until product requirements justify them.

## 8. Observability

The first production slice must provide enough structured telemetry to diagnose application/API, database, identity, and migration failures without logging unrestricted project content.

The observability vendor remains TBD.

Correlation/request identifiers should connect consequential commands to transition metadata where useful without duplicating sensitive user content.

## 9. Deployment and environments

Accepted production deployment:

- Next.js / TypeScript application on Vercel
- Neon PostgreSQL for persistent data
- Clerk for authentication

Use separated development/preview/production configuration and secrets. Preview deployments must not accidentally use production project data.

Production changes require:

- immutable build identity
- explicit versioned database migrations
- expand/contract schema evolution where needed to preserve rollback compatibility
- migration evidence before promotion
- defined application rollback behavior
- tested backup/restore before real production data is relied upon

A successful Vercel deployment is deployment evidence, not automatic release approval.

## 10. Performance and capacity

No numeric production targets are approved yet.

The first production slice should avoid architecture that requires distributed services or specialized infrastructure without measured need. PostgreSQL queries and trace relationships should be designed for ordinary indexed relational access and measured before adding caching/search infrastructure.

## 11. Technology choices

Accepted M1 production stack:

- **Language:** TypeScript
- **Application framework:** Next.js
- **Hosting:** Vercel
- **Relational database:** Neon PostgreSQL
- **Authentication:** Clerk
- **Project authorization:** Wayfound-owned domain model
- **AI/tool integration:** server-side adapters; provider TBD

Still TBD until implementation requires them:

- ORM/query library
- AI/model provider
- observability vendor
- CI/CD details beyond the Vercel/Git integration and required release gates
- numeric SLO/RPO/RTO targets

The current dependency-free static prototype remains useful as a validated prototype/demo, but it is not the accepted production architecture.

## 12. Architecture decision triggers

Create an ADR when a change:

- changes a system or ownership boundary
- selects or replaces a foundational framework, database, hosting platform, identity provider, or major external service
- changes authentication or authorization
- changes the authoritative data source
- introduces a difficult migration
- materially changes deployment or rollback behavior
- accepts a significant security, privacy, reliability, cost, or maintainability tradeoff
- is expensive to reverse

## 13. Known risks and technical debt

| Item | Type | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Production stack not yet implemented | Delivery gap | Validated prototype is not yet a persistent hosted application | Build the first production-capable vertical slice against ADR-0001 through ADR-0007 | Project owner | Open |
| Privacy / retention / age policy details not yet finalized | Product/governance decision | Real hosted user content cannot safely be opened broadly until policy requirements are defined | Define retention, deletion, consent, guardian/age eligibility rules before relevant hosted use | Project owner | Open |
| Local intent classification uses bounded keyword/rule signals | Known limitation | An idea can be under-tagged or over-tagged | Keep routing hints visible and non-authoritative; consider richer semantic classification only after trust/privacy boundaries are approved | Project owner | Open |
| Prototype browser-session state is temporary | Known prototype limitation | Refresh or close can discard prototype progress | Production persistence will replace browser memory as authoritative state | Project owner | Open |
| Draft artifacts are suggestions, not approved state | Governance boundary | Users could mistake generated candidates for project truth | Preserve explicit Draft/Proposed/Approved lifecycle and exact revision binding | Project owner | Open |
| Browser validation is not yet committed as repeatable CI | Validation gap | Manual/local gates do not automatically protect every future UI change | Add browser-level automated interaction/accessibility testing in the production implementation | Project owner | Open |
| Managed-service dependency | Operational risk | Vercel, Neon, or Clerk limits/outages can affect the hosted product | Keep domain/persistence/auth adapters provider-bounded; monitor cost/limits; define failure behavior and migration path | Project owner | Open |

## 14. Change rule

Architecture documentation and implementation must describe the same system. Update this file and any affected ADR when a change modifies a documented boundary, contract, dependency, data authority, deployment model, or failure behavior.
