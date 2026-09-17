# ADR-0005: Application command API and AI/tool boundary

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Expose Wayfound's production browser-to-server contract through a versioned HTTP/JSON application API that separates **queries** from **authoritative commands**.

Consequential lifecycle changes must use explicit domain commands such as `propose`, `approve`, `set-aside`, `change-answer`, or `delete-project`; clients must not be allowed to set privileged lifecycle fields directly with generic object updates.

Keep the server as one modular application boundary initially. External AI providers and tools are accessed only through server-side adapters. Those adapters may return suggestions, analyses, tool results, or evidence, but they cannot directly write authoritative project state or execute approval/membership transitions.

The exact web framework, API library, AI provider, and tool protocol remain separate implementation decisions.

## Context

ADR-0001 establishes the server-side application/API as Wayfound's authority boundary. ADR-0002 defines immutable revisions and transactional state transitions. ADR-0003 requires server-side project authorization. ADR-0004 limits external processing of project content.

The current prototype calls local JavaScript functions directly. A production browser client needs a remote interface that preserves the same domain rules while also handling authentication, concurrency, retries, audit correlation, external AI/tool calls, and partial failures.

A generic CRUD API that lets a browser write `{status: "approved"}` would undermine the project model. Approval is not a field edit; it is a guarded command that validates actor authority, exact revision identity, source freshness, and concurrency before committing a transition.

## Decision drivers

- Keep all authoritative state transitions inside one enforceable application boundary.
- Make privileged transitions explicit and testable.
- Prevent browser clients from forging lifecycle state.
- Support optimistic concurrency and safe retries.
- Keep API behavior understandable to future maintainers.
- Keep AI providers and tool protocols replaceable.
- Prevent AI/model output from becoming authoritative merely because an adapter returned it.
- Preserve traceability, correlation IDs, actor identity, and revision identifiers across requests.
- Support a modular-monolith implementation before scale justifies distributed services.
- Avoid a framework-specific API contract becoming the domain model.

## API style

Use versioned HTTP/JSON as the initial external application contract.

The exact URL structure can evolve during implementation, but the contract should distinguish:

### Queries

Read current or historical project state without changing authority.

Examples:

```text
GET project summary
GET current Interview/decision state
GET Records
GET current Artifact and revision
GET Artifact history / trace links
GET current Actor permissions for project
```

Read models may be optimized or cached. They do not become independent data authorities.

### Commands

Request a specific domain transition.

Examples:

```text
CreateProject
AcceptInterviewAnswer
ChangeInterviewAnswer
ProposeArtifact
SetAsideArtifact
ReturnArtifactToDraft
ApproveArtifact        (future, once requirement is approved)
AddProjectMember
ChangeProjectMemberRole
DeleteProject
```

A command names the intent and lets the application enforce the rules for that transition.

## No generic privileged status writes

The API must not expose a general endpoint where clients can directly write privileged states such as:

```json
{ "status": "approved" }
```

Instead a request asks the server to perform `ApproveArtifact` against an exact revision and expected version. The server determines whether the transition is allowed.

Ordinary editable fields can still use conventional create/update interfaces where no lifecycle/security rule is bypassed.

## Command envelope

Consequential commands should carry, directly or through protocol headers/context:

- project identifier
- target logical object identifier
- exact target revision where applicable
- expected concurrency version/revision
- authenticated Actor context supplied by the server session, not trusted from body input
- request/correlation identifier
- idempotency key where retry could otherwise duplicate a transition
- command-specific data

The server records the relevant request/correlation identifier in transition metadata for diagnosis and traceability.

## Concurrency and conflicts

Commands that depend on current project/object state must include an expected version or equivalent concurrency token.

If the authoritative state changed since the client's view:

- the command fails as a conflict
- no partial authoritative transition is committed
- the client reloads/reconciles current state
- the server does not silently overwrite the newer state

HTTP status details are implementation-level, but the API must have a stable machine-readable distinction between validation errors, authorization failures, concurrency conflicts, missing resources, and dependency failures.

## Idempotency

Commands that create durable objects, external work, or transition state should support safe retry where duplicate execution would be harmful.

Examples:

- project creation
- artifact proposal
- future approval
- external tool execution

An idempotency key is scoped to the authenticated Actor/project/command as appropriate. Repeating the same accepted key returns the prior command result instead of performing the transition twice.

## Validation order for authoritative commands

A consequential command should conceptually enforce:

1. authenticate Actor
2. resolve project/membership
3. authorize capability
4. validate command input
5. validate target revision/source freshness
6. validate expected concurrency version
7. execute domain transition in a transaction
8. persist trace links and transition metadata
9. return resulting authoritative state/read model

Steps can be optimized in implementation, but bypassing authorization or state validity is not allowed.

## Application boundary

The initial production server should be a **modular monolith**, not a network of microservices.

Logical modules can include:

- Projects
- Interview / Decisions
- Records / Traceability
- Artifacts / Requirements / Work
- Review / Approval
- Identity / Membership
- Integrations / AI / Tools
- Audit / Operations

Modules should have explicit interfaces in code and database access rules where practical, but they deploy together initially.

Split modules into separate services only if measured scale, security isolation, ownership, or failure-isolation requirements justify the operational cost.

## External AI adapter boundary

All external model calls originate server-side through an adapter interface.

The adapter receives only the project context approved for the feature and allowed by ADR-0004.

A model response can produce a typed result such as:

- suggested question
- classification/routing hint
- draft requirement candidate
- draft work item candidate
- architecture suggestion
- review finding

The result is not authoritative state.

The application/domain layer decides whether the response is:

- shown transiently
- discarded
- saved as a Draft after explicit user action
- linked as evidence/provenance

The AI adapter cannot invoke repository/database methods that create an Approved project artifact directly.

## Model provenance

When generated output is materialized because a user acts on it, Wayfound should be able to retain appropriate provenance such as:

- provider/model family identifier
- adapter/prompt-template/version identifier
- generation timestamp
- source project revision identifiers
- human Actor/disposition that materialized it

Do not store hidden model reasoning/chain-of-thought. Store only the inputs/outputs/provenance required for product traceability, quality, cost, or audit policy.

Provider-specific request IDs may be stored as operational metadata if needed, subject to retention/privacy policy.

## Tool adapter boundary

External tools/integrations use server-side adapters with an allowlisted operation contract.

A tool operation declares:

- tool/provider
- operation name
- project context required
- actor/service identity
- permission required
- whether action is read-only or state-changing
- input contract
- expected output/evidence contract
- timeout/retry/idempotency behavior

Tool results may become Evidence or Draft inputs through the application layer. They do not bypass Wayfound lifecycle transitions.

## Human control for external actions

A future tool capable of consequential external actions must have an explicit risk/approval policy.

The default integration posture is:

- read operations can be enabled with least privilege
- reversible low-risk actions require explicit capability
- destructive/high-impact actions require an approved human-control model before implementation
- service/AI actors cannot elevate their own permissions

The current production baseline does not authorize autonomous destructive external actions.

## Failure handling

### AI/provider unavailable

Core project read/write behavior remains available. AI-assisted features show a bounded failure/degraded state rather than blocking ordinary project access.

### Tool/provider unavailable

The application records/returns dependency failure without pretending the requested operation succeeded. Retries follow the adapter's defined policy.

### Command transaction failure

No transition metadata claims success unless authoritative state committed. External side effects that cannot participate in the same database transaction need an explicit workflow/outbox/reconciliation pattern before that operation is enabled.

## External side-effect consistency

For future operations that both change Wayfound state and call an external tool, do not rely on a distributed transaction.

Use an explicit durable workflow pattern such as:

1. commit an intent/job with authoritative project context
2. worker/adapter performs external call idempotently
3. capture provider result/evidence
4. reconcile Wayfound job/state
5. surface failed/uncertain outcomes for human review

The exact queue/job infrastructure remains an implementation decision.

## API versioning

The browser client and API may deploy together, but the contract must still be versionable.

Prioritize backward-compatible additions. Breaking changes require an explicit migration/release plan.

Do not encode database table shapes directly as the public API contract.

## Options considered

### Option A — Generic CRUD API over database entities

**Summary:** Expose create/read/update/delete operations for Projects, Records, and Artifacts and let the client change fields directly.

**Advantages:**

- Fast to implement.
- Familiar tooling.
- Low endpoint count.

**Disadvantages:**

- Privileged lifecycle rules become easy to bypass or scatter across clients.
- Approval/proposal semantics collapse into status-field edits.
- Harder to express concurrency, source freshness, and actor authorization consistently.

**Risks:**

- Browser or integration clients can accidentally become domain authorities.

### Option B — Graph/query schema as the primary command and query boundary

**Summary:** Use a graph-oriented API for reads and mutations.

**Advantages:**

- Flexible client reads.
- Strong schema tooling.
- Can reduce over/under-fetching.

**Disadvantages:**

- Does not by itself solve lifecycle-command semantics.
- Adds a foundational framework/protocol choice before Wayfound needs its flexibility.

**Risks:**

- Generic mutations can reproduce the same privileged-field problem as CRUD if domain commands are not explicit.

### Option C — HTTP/JSON queries + explicit domain commands

**Summary:** Use ordinary versioned HTTP reads and explicit command endpoints/handlers for consequential state transitions.

**Advantages:**

- Boring and maintainable.
- Clear authorization and audit boundary.
- Maps directly to the revision/transition model.
- Easy to exercise from browser, automated tests, or future clients.
- Does not require exposing persistence shapes.

**Disadvantages:**

- More deliberate endpoint/command design.
- Some command endpoints are less purely REST-like.

**Risks:**

- Poorly defined commands can become ad-hoc RPC unless domain vocabulary remains disciplined.

## Rationale

Option C makes the important distinction visible in the API: reading an artifact, editing Draft text, proposing a revision, and approving a revision are different operations with different authority and validation rules.

This supports Wayfound's human-control model and keeps clients thin. The browser asks for a transition; the server decides whether the transition is valid against current Actor permissions, source revisions, lifecycle state, and concurrency token.

Keeping AI/tools behind server-side adapters preserves provider replaceability and prevents integration code from becoming another authority path. Starting as a modular monolith keeps those boundaries clear in code without paying the operational complexity of distributed services prematurely.

## Consequences

### Positive

- Privileged transitions are explicit and testable.
- Browser/client tampering cannot directly set approved state.
- Optimistic concurrency and idempotency have a natural contract.
- AI/tool integrations remain replaceable adapters.
- Core Wayfound works when external AI is disabled/unavailable.
- A modular monolith keeps operations simpler while preserving logical boundaries.

### Negative

- API/domain command design requires more care than exposing database objects.
- External tool side effects need durable workflow/reconciliation patterns.
- Maintaining backward compatibility becomes a release responsibility.

### Neutral or accepted constraints

- Exact framework and endpoint paths are not chosen here.
- GraphQL or another read interface could be added later if real client needs justify it.
- A queue/background-job technology is not selected until a feature needs external side-effect workflows.
- AI/model provider is not selected here.

## Reversibility

The HTTP/JSON boundary is replaceable if domain commands, identifiers, and persistence contracts remain separated from transport details.

Moving from modular monolith to services is possible later because modules and adapters already expose logical interfaces. Moving back from premature distributed services would be substantially harder, which is why this ADR avoids them initially.

## Validation

Before this ADR can move from Proposed to Accepted, demonstrate through API contract tests or a production-slice prototype that:

1. a client cannot approve an artifact through a generic field update
2. `ProposeArtifact` binds exact content/source revisions and Actor context
3. stale expected-version commands fail without overwriting newer state
4. duplicate idempotent command submission does not create duplicate transitions
5. unauthorized commands fail even if the browser claims a privileged role
6. read/query responses cannot be used to mutate server state implicitly
7. an AI adapter response remains a suggestion until a human/domain command materializes it
8. an AI/service Actor cannot invoke the approval path
9. dependency/provider failures return explicit degraded/failure state
10. an external side-effect operation has a durable reconciliation design before being enabled

## Reconsideration triggers

Revisit this decision if:

- Wayfound requires multiple independently deployed clients with materially different query needs
- measured API/query complexity justifies a graph-oriented read layer
- scale/security isolation justifies splitting modules into services
- an integration protocol becomes a required public Wayfound API surface
- another transport demonstrates simpler operation while preserving explicit command, authority, concurrency, and adapter boundaries

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- ADR-0003 — Identity and project authorization boundary
- ADR-0004 — Privacy, retention, and age boundary
- Requirement: WF-016 — Review actionable draft artifacts without implying approval
- Architecture section: Interfaces and contracts; Security architecture
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial production API, command, AI, and tool-adapter boundary |
