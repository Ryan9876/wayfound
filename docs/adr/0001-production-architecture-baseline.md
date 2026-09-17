# ADR-0001: Production architecture baseline

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Use a layered production architecture in which the browser is the interaction surface, a server-side Wayfound application/API enforces authoritative state transitions, and a relational project store holds durable project state and traceability records.

Keep specific frontend framework, hosting provider, identity provider, database vendor, and AI provider decisions separate. External AI and tool calls must execute through server-side adapters and must not become an authoritative source of project truth.

## Context

The validated prototype now supports a complete local flow from a rough idea through adaptive Interview decisions, typed Records, generated Draft artifacts, and Draft / Proposed / Set aside review states.

The prototype intentionally keeps everything in one browser session. That is no longer sufficient for the next production-capable slice because formal project state, project-owner approval, persistence, privacy, identity, auditability, and future AI/tool access require explicit authority and trust boundaries.

Wayfound serves users with varied technical experience, including younger builders. The production architecture therefore must not introduce hosted storage, external AI processing, or identity-dependent behavior before the applicable privacy, consent, retention, and age-related requirements are defined.

## Decision drivers

- Preserve the current rule that generated or AI-produced content is not automatically authoritative.
- Make project state durable and traceable without treating the browser as the system of record.
- Support explicit human-controlled state transitions such as Draft → Proposed → Approved.
- Keep external AI providers, development agents, and tools replaceable.
- Keep secrets and provider credentials out of the browser.
- Allow security, privacy, retention, and audit controls to be enforced in one authoritative layer.
- Preserve a clear path from the current static prototype to a production application.
- Avoid selecting a vendor or framework before its operational and cost tradeoffs are known.
- Keep the architecture understandable and maintainable by people who did not build the first version.

## Options considered

### Option A — Continue as a browser-only application

**Summary:** Keep Wayfound entirely client-side and add browser persistence such as IndexedDB or local files.

**Advantages:**

- Smallest change from the prototype.
- Very low infrastructure complexity.
- Strong local privacy when no data leaves the device.
- No hosted identity requirement for a single-device experience.

**Disadvantages:**

- No reliable shared project authority across devices or users.
- Formal approval identity and auditability remain weak.
- Collaboration and durable server-side integrations become awkward.
- Secrets and external AI/tool access cannot be handled safely in a purely browser-owned architecture.

**Risks:**

- Local browser state can accidentally become a second or conflicting authority later.
- A later migration to shared hosted state becomes more difficult after local persistence formats spread.

### Option B — Use one integrated full-stack framework as both UI and authority

**Summary:** Select a specific full-stack web framework and let it own UI, server logic, persistence access, and integration endpoints.

**Advantages:**

- Fast path to a deployable application.
- Fewer explicit service boundaries initially.
- Common deployment models can reduce operational overhead.

**Disadvantages:**

- Couples architectural boundaries to a framework choice before Wayfound has selected its production stack.
- Can blur the distinction between presentation, domain rules, and authoritative state transitions.
- Makes provider/framework replacement more expensive if domain logic is embedded in framework-specific code.

**Risks:**

- Convenience decisions can become long-lived architecture accidentally.
- A framework migration could affect UI, API behavior, identity, and data access at once.

### Option C — Browser client + authoritative application/API + relational project store

**Summary:** Keep the browser focused on interaction and local view state. Put authoritative project transitions, permissions, external-service access, and durable persistence behind a server-side application/API. Store durable project state and traceability relationships in a relational database.

**Advantages:**

- Makes the authority boundary explicit.
- Fits Wayfound's requirement for traceability between decisions, requirements, work, evidence, and releases.
- Provides a natural location for authorization, audit behavior, privacy controls, and validation rules.
- Keeps AI providers and external tools behind replaceable adapters.
- Allows the UI framework and hosting provider to change without redefining project authority.
- Provides a clear place to enforce that AI output cannot approve or silently mutate authoritative state.

**Disadvantages:**

- More infrastructure than the current prototype.
- Requires a deliberate API/domain contract.
- Introduces hosted-data, identity, privacy, backup, migration, and operational responsibilities.

**Risks:**

- An oversized API or premature service decomposition could create unnecessary complexity.
- Hosted persistence cannot proceed safely until privacy, retention, consent, and age-related requirements are approved.

## Rationale

Option C best matches the product behavior Wayfound has already validated. The prototype has deliberately separated Interview logic, Records, generated Draft artifacts, and review state instead of letting presentation become authority. The production architecture should preserve that property.

A server-side application/API creates one explicit enforcement point for durable state transitions. That allows Wayfound to distinguish a user-visible proposal from an approved requirement, preserve the identity of the actor making a consequential change, and prevent an AI model or browser client from silently promoting its own output.

A relational project store is proposed because the core Wayfound model is relationship-heavy: projects contain decisions, requirements, work items, source records, evidence, reviews, releases, and links among them. These relationships need durable identifiers, transactional updates, history, and queryability. This ADR deliberately does not choose a specific relational database product.

Specific framework, hosting, identity, and AI-provider choices remain separate decisions because they are replaceable implementation concerns and have not yet been evaluated against cost, privacy, maintainability, or operational requirements.

## Consequences

### Positive

- The browser is no longer a candidate system of record for production project state.
- Formal approval can later be tied to authenticated project authority rather than a UI button alone.
- Secrets and external provider credentials stay server-side.
- AI/tool integrations can be changed without changing the authoritative project model.
- Traceability can be represented as durable relationships rather than reconstructed from generated documents.
- Validation, authorization, and audit rules have a single enforcement boundary.

### Negative

- Wayfound gains backend and database operational responsibilities.
- Production use will require an identity model and permission rules.
- Hosted data introduces privacy, retention, deletion, backup, and incident-response obligations.
- Schema evolution and migration become explicit engineering work.

### Neutral or accepted constraints

- The current dependency-free static prototype can remain as a prototype/demo surface while production code is introduced separately.
- `Proposed` remains non-authoritative until a later approved requirement defines formal promotion/approval behavior.
- No user content should be persisted or sent to external AI until the relevant privacy and age-related requirements are approved.
- This ADR defines architecture boundaries, not vendors.

## Reversibility

The boundary decision is moderately expensive to reverse once persistent projects exist, but vendor choices within the boundaries remain intentionally replaceable.

The relational store should use application-owned identifiers and schema contracts rather than vendor-specific object identities. External AI, identity, and tool providers should be accessed through adapters so those providers can be replaced without rewriting the project model.

A future move from a modular application/API to separate services is possible if scale or isolation requirements justify it. The initial production implementation should remain one deployable application boundary rather than introducing distributed services prematurely.

## Validation

Before this ADR can move from Proposed to Accepted, validate that the architecture can support one production-capable vertical slice with these properties:

- an authenticated or otherwise explicitly identified actor can create/open a project
- authoritative project state survives browser/session loss
- a Draft artifact can be proposed without becoming approved
- a permitted project authority can perform a distinct approval transition
- every consequential transition records actor, time, source artifact/record, and resulting state
- browser clients cannot bypass server-side transition rules
- an external AI/tool adapter can return a suggestion without directly mutating authoritative project state
- deletion/retention behavior is defined before real user data is stored
- backup/restore and rollback behavior are defined for the chosen persistence implementation

## Reconsideration triggers

Revisit this decision if:

- Wayfound is intentionally limited to a single-device, local-only product with no shared or hosted project state
- approved product scope removes collaboration, durable history, formal approval, or external integrations
- a non-relational data model demonstrates materially better support for Wayfound's traceability relationships without weakening transactional integrity
- regulatory, privacy, or age-related requirements make hosted persistence unsuitable for the intended user group
- operational constraints make a server-side application/API infeasible for the target deployment environment
- measured scale or isolation needs justify splitting the modular application into separate services

## Related sources

- Requirement: WF-012 — Project Interview state into structured records
- Requirement: WF-014 — Derive draft build artifacts from Records
- Requirement: WF-016 — Review actionable draft artifacts without implying approval
- Architecture section: Data model and authority; Security architecture; Deployment and environments
- Delivery milestone: M1 — Production architecture baseline
- Acceptance record: ADR-0007 — Production stack selection

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial production-boundary proposal after the validated Interview → Records → Draft artifacts → review flow |
| 2026-09-17 | Accepted by ADR-0007 | Project owner accepted the M1 architecture package and concrete stack; ADR-0007 is the formal acceptance record |
