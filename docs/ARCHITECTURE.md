# Wayfound Architecture

**Status:** Approved local-first production baseline; M2 implementation in progress

## Purpose

This file describes the approved technical structure of Wayfound. It records system boundaries, major components, interfaces, data authority, operational behavior, and technical constraints.

Use an Architecture Decision Record (ADR) for consequential decisions that explain why the architecture has a specific form.

## 1. Architecture summary

Wayfound has two intentionally distinct architectural states during the transition to durable operation.

### Validated prototype

The validated Interview / Records / Draft-artifact experience is a dependency-free static browser application. It keeps temporary state in the browser and has no durable project store or required AI dependency.

### Accepted durable target

Wayfound is local-first by default.

The accepted runtime is a modular Next.js + TypeScript application running on the user's computer. The local Wayfound server/domain layer is the only authoritative transition boundary. A local SQLite database stores durable project state. A stable local human Actor represents the person using that installation, so normal local operation requires no account or external identity provider.

Wayfound owns project authorization, lifecycle rules, revisions, traceability, proposal/approval semantics, and concurrency rules.

AI is optional. It is off by default. Ollama and LM Studio are first-class local adapters. External model providers may be configured only through explicit provider adapters and must be opt-in before project content is sent outside the computer.

Hosted adapters such as Vercel, PostgreSQL/Neon, and Clerk remain possible for future hosted/team mode but are not prerequisites for local Wayfound or for M2 validation.

ADR-0009 is the current authoritative runtime decision. It supersedes ADR-0007's hosted-first defaults while preserving the server-authority and provider-separation boundaries from ADR-0001 through ADR-0006.

## 2. System context

### Users and actors

Wayfound supports users with varied technical experience and project types, including games, hobby projects, school projects, business applications, internal tools, and technical systems.

Actors include:

- a stable local human Actor for default single-user local mode
- hosted human Actors mapped from an external identity provider when hosted/team mode is deliberately enabled
- future service or AI Actors that are explicitly distinguished from humans and do not receive approval authority by default

### External systems

No external system is required for default local operation.

Optional integrations include:

- Ollama — local model server
- LM Studio — local model server
- external OpenAI-compatible model endpoints — explicit opt-in only
- PostgreSQL/Neon — optional hosted persistence adapter
- Clerk — optional hosted identity adapter
- Vercel or another host — optional hosted deployment
- future tools/integrations behind explicit adapters

### Trust boundaries

Default local trust boundaries are:

1. local browser UI ↔ local Wayfound server/application boundary
2. local Wayfound server ↔ local SQLite project store
3. optional: local Wayfound server ↔ local LLM service
4. optional and explicit: Wayfound server ↔ external AI/tool provider

Hosted mode adds identity, remote database, and hosting trust boundaries only when that mode is intentionally enabled.

Secrets, provider credentials, consequential authorization, and authoritative lifecycle transitions remain server-side/local-service-side and never move into browser authority.

## 3. Major components

| Component | Responsibility | Owns | Depends on | Failure effect |
| --- | --- | --- | --- | --- |
| Wayfound shell | Navigation, layout, brand styling, and page framing | Presentation only | Browser / Next.js UI | Page layout or navigation is degraded |
| Interview renderer | Prompts, choices, recommendations, progress, and summary | Current rendered view | Interview model | User cannot complete guided flow |
| Idea classifier | Detects broad routing signals | Routing hints only | Interview/domain logic | Questions may be less relevant |
| Question registry / selector | Defines and selects applicable questions | Interview question policy | Interview state | Required decisions can be skipped or unnecessary questions shown |
| Interview domain model | Answers, history, applicability, derived state, progress, completion | Domain semantics | Domain modules | Decisions or derived state become incorrect |
| Record projector | Projects accepted Interview state into typed trace records | Derived trace view | Interview domain model | Traceability becomes incomplete or misleading |
| Draft artifact projector | Produces draft brief/Journey/requirement/work candidates | Derived previews | Current Records | Suggested next artifacts become incomplete or misleading |
| Artifact review model | Draft / Proposed / Set aside review semantics | Review disposition semantics | Draft artifacts | Stale or misleading proposal state can persist |
| Local Next.js server/application boundary | HTTP handling, commands, authorization orchestration, transactions | Authoritative write path | Domain modules, identity adapter, persistence adapter | Authoritative mutations unavailable |
| Wayfound domain/application layer | Lifecycle rules, concurrency checks, authorization checks, traceability, command semantics | Authoritative project rules | Persistence + Actor adapters | Project state could become invalid if bypassed |
| Local Actor adapter | Creates/reuses stable installation-local human Actor | Local identity mapping only | Local persistence | Local project access unavailable if corrupted |
| Wayfound authorization model | Project membership, roles/capabilities, approval authority | Project authorization truth | Wayfound Actor + project state | Protected actions may be denied or unsafe if incorrect |
| Local SQLite persistence adapter | Reads/writes current state, revisions, trace links, transition metadata | Default persistence contract | Local filesystem | Durable project state unavailable |
| Optional PostgreSQL adapter | Hosted persistence implementation of the same contracts | Hosted persistence only | PostgreSQL/Neon | Hosted durable state unavailable; local mode unaffected |
| AI provider adapter | Encapsulates local or approved external model calls | Provider integration only | Selected model server/provider | Suggestions unavailable; project authority remains intact |
| Tool adapters | Encapsulate optional external tool calls | Provider integration only | External tools | Integration unavailable; project authority remains intact |

The application starts as one local modular application boundary. Do not split into microservices until measured scale, isolation, or operational requirements justify it.

## 4. Data model and authority

### Prototype authority

The validated static prototype keeps state in browser memory. That state remains valid as prototype/demo state only and is not the durable system of record.

### Durable authority

The Wayfound application/API is the only writer of authoritative project state.

The persistence model uses:

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

Examples include:

- CreateProject
- AcceptInterviewAnswer
- ProposeArtifact
- SetAsideArtifact
- ReturnArtifactToDraft
- future ApproveArtifact / RejectArtifact / SupersedeArtifact

Consequential commands should include an expected version/revision or equivalent concurrency token and an idempotency key where retry duplication would be harmful.

Clients do not write privileged lifecycle fields directly. Local operation does not weaken this rule.

### Internal module boundaries

Keep presentation, route/request handling, application commands/queries, domain rules, authorization, persistence, identity, and AI/tool adapters separate even though they live in one local Next.js application initially.

Domain logic should not require Next.js-specific request/page objects or a specific database/provider to express project rules.

## 6. Security and privacy architecture

- Default local mode requires no external account.
- A stable local human Actor is stored in the local project database.
- Wayfound owns project membership, roles/capabilities, and approval authority.
- Human approval requires an identified human Actor with the required project capability.
- AI/service Actors do not receive approval, membership-management, or destructive project authority by default.
- Local model use does not grant model authority.
- External AI is disabled by default.
- Non-loopback AI endpoints fail closed unless external AI processing is deliberately enabled.
- API/provider secrets stay server-side/local and are never written into project records, Git, browser state, or ordinary telemetry.
- Consequential writes must be authorized in the Wayfound application boundary.

Projects are private/local by default.

Ordinary telemetry/logs must not copy unrestricted project free text. Hosted privacy, retention, deletion, consent, and younger-user eligibility requirements still gate any future broad hosted use.

## 7. Reliability and failure model

Durable behavior must include:

- stale writes rejected through optimistic concurrency instead of silent last-write-wins
- consequential state changes committed transactionally
- failed transitions not recorded as successful audit events
- AI/provider failures isolated so model loss does not corrupt authoritative project state
- explicit local schema migrations
- local backup/restore guidance and validation before relying on durable user data
- hosted migration/rollback procedures when hosted mode is enabled

Specific numeric SLO/RPO/RTO targets remain TBD until product requirements justify them.

## 8. Observability

The durable application must provide enough structured telemetry to diagnose command, persistence, identity-adapter, AI-adapter, and migration failures without logging unrestricted project content.

Local operation must not require an external observability vendor.

Correlation/request identifiers should connect consequential commands to transition metadata where useful without duplicating sensitive user content.

## 9. Deployment and environments

### Default local mode

- Next.js / TypeScript application runs on the user's computer
- SQLite stores project data locally
- local Actor requires no sign-in
- AI may be off, Ollama, LM Studio, or another explicitly configured adapter

The default database path is `~/.wayfound/wayfound.sqlite`, with a configurable override for testing, backups, or portable storage.

Desktop packaging/installer technology remains TBD. M2 may run through the local Node/Next.js process and browser.

### Optional hosted mode

Vercel, PostgreSQL/Neon, Clerk, or equivalent providers may be used later through adapters. Hosted mode requires separate environment/secrets management and additional privacy/retention/identity/release gates.

A successful hosted deployment is deployment evidence, not automatic release approval.

## 10. Performance and capacity

No numeric production targets are approved yet.

The local-first slice should avoid distributed services or specialized infrastructure without measured need. SQLite is appropriate for the initial single-user local workload; measure before introducing caching, search infrastructure, synchronization services, or a mandatory remote database.

## 11. Technology choices

Current accepted runtime:

- **Language:** TypeScript
- **Application framework:** Next.js
- **Default execution:** local Node.js / Next.js server + browser UI
- **Default persistence:** SQLite via `better-sqlite3`
- **Default identity:** stable local Wayfound human Actor
- **Project authorization:** Wayfound-owned domain model
- **AI default:** off
- **Local AI:** Ollama and LM Studio through OpenAI-compatible localhost adapters
- **External AI:** optional OpenAI-compatible endpoint with explicit outbound opt-in
- **Hosted persistence:** optional PostgreSQL/Neon adapter
- **Hosted identity:** optional Clerk adapter
- **Hosted deployment:** optional Vercel or other host

Still TBD until implementation requires them:

- desktop packaging/installer
- additional AI provider-specific adapters
- observability provider for hosted mode
- synchronization/collaboration architecture
- numeric SLO/RPO/RTO targets

The dependency-free static prototype remains useful as a validated UX/demo reference but is not the durable runtime.

## 12. Architecture decision triggers

Create an ADR when a change:

- changes a system or ownership boundary
- selects or replaces a foundational framework, database, hosting platform, identity provider, or major external service
- changes authentication or authorization
- changes the authoritative data source
- introduces a difficult migration
- materially changes deployment or rollback behavior
- changes whether project content can leave the local machine
- accepts a significant security, privacy, reliability, cost, or maintainability tradeoff
- is expensive to reverse

## 13. Known risks and technical debt

| Item | Type | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Local-first durable runtime still being implemented | Delivery gap | Validated prototype and durable local application are not yet fully unified | Complete M2 against ADR-0009 and validate local persistence/restart flow | Project owner | In progress |
| Local database backup/upgrade UX not yet productized | Reliability/UX | Users could lose local project history if the file is damaged or deleted | Add documented backup/export and tested migration/recovery before broad reliance | Project owner | Open |
| Desktop packaging not selected | UX/operations | Users currently need a local Node/Next process rather than a one-click desktop app | Evaluate native wrapper/installer after M2 local runtime is stable | Project owner | Open |
| Privacy / retention / age policy details not yet finalized for hosted mode | Product/governance decision | Real hosted user content cannot safely be opened broadly until policy requirements are defined | Define hosted retention, deletion, consent, guardian/age eligibility rules before relevant hosted use | Project owner | Open |
| Local intent classification uses bounded keyword/rule signals | Known limitation | An idea can be under-tagged or over-tagged | Keep routing hints visible and non-authoritative; consider richer semantic classification through approved local/optional AI adapters | Project owner | Open |
| Draft artifacts are suggestions, not approved state | Governance boundary | Users could mistake generated candidates for project truth | Preserve explicit Draft/Proposed/Approved lifecycle and exact revision binding | Project owner | Open |
| Browser validation is not yet committed as repeatable CI | Validation gap | Unit/integration gates do not automatically protect every future UI change | Add browser-level local interaction/accessibility testing | Project owner | Open |
| Local and hosted adapters can drift | Architecture risk | Same domain command could behave differently by storage/identity mode | Keep shared domain rules and contract/integration tests for every supported adapter | Project owner | Open |

## 14. Change rule

Architecture documentation and implementation must describe the same system. Update this file and any affected ADR when a change modifies a documented boundary, contract, dependency, data authority, deployment model, content-egress rule, or failure behavior.
