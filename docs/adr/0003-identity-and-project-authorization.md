# ADR-0003: Identity and project authorization boundary

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Use an external authentication provider behind a Wayfound-owned identity boundary, while keeping project authorization inside the Wayfound application/API.

Wayfound will map authenticated identities to stable internal Actor identifiers. Project access will be enforced server-side using project-scoped capabilities. Human roles may bundle capabilities for usability, but roles are not the authoritative security primitive.

Formal project transitions such as future `Approve`, project membership changes, and deletion require an identified human Actor with the applicable capability. Browser state, identity-provider claims alone, AI agents, tool adapters, and service actors cannot grant themselves project authority.

The exact authentication provider and account UX remain separate implementation decisions.

## Context

ADR-0001 proposes a browser client with a server-side authoritative application/API. ADR-0002 proposes durable revisions, trace links, and transition metadata that include an Actor reference for consequential changes.

The validated prototype does not have accounts or authorization. That is appropriate while project state exists only inside one browser session. It is not sufficient for durable hosted projects because Wayfound must be able to answer questions such as:

- Who changed this decision?
- Who proposed this requirement revision?
- Who had authority to approve it?
- Who invited another collaborator?
- Who requested deletion?
- Was a transition performed by a person, an AI suggestion engine, or a service integration?

Wayfound may be used by younger builders as well as adults. Authentication, authorization, age/consent policy, and parental/guardian relationships are related but distinct concerns. This ADR defines the identity and authorization boundary only; it does not invent an age policy or guardian model.

## Decision drivers

- Formal approval must represent an identified human action with explicit project authority.
- Authorization must be enforced by the server, not trusted to the browser.
- Identity-provider replacement should not require rewriting project ownership/history.
- Email addresses and provider-specific subject identifiers should not become project primary keys.
- AI/model/tool actors must be distinguishable from human actors.
- Non-human actors must not be able to approve, manage project authority, or delete projects by default.
- Permission changes must be auditable.
- The model should support solo builders and future collaboration without forcing enterprise role complexity into the first release.
- Future age/guardian requirements must be able to attach without redefining every project record.
- Authorization rules should be easy to understand and test.

## Identity model

### Internal Actor

Wayfound owns a stable internal `Actor` identity used by project state, transition history, and authorization.

An Actor has, conceptually:

- immutable application-owned identifier
- actor type
- active/disabled state
- timestamps
- zero or more external authentication identity mappings

Initial actor types should distinguish at least:

- `human`
- `service`
- `ai-agent` or equivalent non-human execution identity

The exact naming can change, but human and non-human authority must remain distinguishable.

### External identity mapping

Authentication providers prove that a session corresponds to an external identity. Wayfound maps that identity to its internal Actor.

Conceptually:

```text
External Identity
(provider + provider subject)
          │
          ▼
Wayfound Identity Mapping
          │
          ▼
       Actor
          │
          ▼
Project Membership / Capabilities
```

Provider-specific identifiers remain at the identity boundary. Project records, approvals, audit entries, and ownership reference Wayfound Actor IDs.

This allows a provider to be replaced or multiple login methods to be linked without changing historical project authorship.

## Authentication boundary

The browser may receive and hold a short-lived authenticated session or provider token according to the chosen implementation, but the Wayfound server must validate the session before accepting an authoritative write.

Rules:

1. The browser is not an authorization authority.
2. Client-supplied role/capability fields are never trusted.
3. Identity-provider claims authenticate an identity; they do not by themselves grant project permissions.
4. Provider secrets and privileged credentials remain server-side.
5. Disabled/revoked actors must be rejectable without rewriting historical records.

## Authorization model

Use project-scoped capabilities as the enforcement primitive.

Initial capability vocabulary should support at least:

- `project.read`
- `project.edit`
- `artifact.propose`
- `artifact.approve`
- `project.manage_members`
- `project.delete`

Additional capabilities can be added when concrete product behavior requires them.

The server evaluates capability requirements for every authoritative command. The UI can hide unavailable actions for usability, but hiding a button is not authorization.

## Human roles

Roles are user-friendly bundles of capabilities, not hard-coded security truth.

A reasonable starting set is:

### Owner

Typical bundle:

- read
- edit
- propose
- approve
- manage members
- delete project

A project must always have a defined authority path for ownership transfer or deletion before multi-user production use is enabled.

### Builder

Typical bundle:

- read
- edit
- propose

No approval, membership-management, or project-deletion capability by default.

### Reviewer

Typical bundle:

- read
- approve

Whether Reviewers can also edit or propose is a product-policy choice and should remain configurable rather than assumed by this ADR.

### Viewer

Typical bundle:

- read only

The role names and exact bundles may change after UX testing. The security requirement is that server-side capabilities remain explicit.

## Formal approval

A future `Approve` operation must satisfy both data and identity requirements.

The server must verify, in the same authoritative command path:

- authenticated Actor is human
- Actor is active
- Actor has `artifact.approve` for the project
- target Artifact Revision exists and is current/eligible
- source/revision validity checks from ADR-0002 pass
- concurrency check passes

If any condition fails, approval is rejected.

Approval metadata records the internal Actor ID and exact Artifact Revision. The record should not rely on mutable display name or email as its identity anchor.

This ADR does **not** require separation of duties or prohibit self-approval. Those are product/governance policies that can be added later if a target use case requires them.

## Non-human actors

AI and tool integrations must use explicit non-human Actor identities or equivalent service principals.

Default rules:

- may read only the project context explicitly granted to the adapter
- may generate Draft suggestions
- may execute only explicitly allowed tool actions
- may not obtain `artifact.approve`
- may not manage project membership
- may not delete projects
- may not grant themselves additional permissions

If a future use case needs a non-human actor to perform a consequential action, that capability must be introduced through a separate approved requirement/ADR with its risk and human-control model stated explicitly.

## Membership and capability persistence

The authoritative store should support, conceptually:

### Project membership

- project ID
- Actor ID
- assigned role/bundle
- membership state
- created/changed timestamps
- Actor that granted/changed membership

### Role/capability mapping

The implementation may use fixed application-defined role bundles initially. If custom roles are later needed, capability assignments can become data-driven.

Do not store authorization solely inside authentication-provider groups unless the product deliberately adopts provider-owned authorization in a later ADR.

## Permission changes

Membership and capability changes are consequential transitions and must be recorded in transition/audit metadata.

At minimum record:

- target project
- affected Actor
- prior role/capability state
- resulting role/capability state
- acting human Actor
- server timestamp
- reason/operation code

The audit representation should avoid copying unnecessary personal profile data.

## Revocation behavior

Authorization is checked at authoritative write time.

A browser that previously displayed an enabled action may receive a permission error if the Actor's access changed before submission. The client must treat server authorization as final and refresh current project permissions/state.

Do not rely on long-lived client-cached permissions for consequential writes.

## Anonymous and local use

The current browser-only prototype can remain available without accounts because it does not persist authoritative hosted project state.

This ADR does not require every future Wayfound experience to require login. It does require an identified/authorized Actor for authoritative hosted transitions whose history or approval must be durable.

If Wayfound later supports anonymous hosted projects, guest links, classroom modes, or device-local projects, those modes must define:

- who owns the project
- what can be written
- how recovery works
- whether approval is allowed
- how deletion/retention works

They must not weaken the authority rules of identified projects accidentally.

## Younger users, parents, and guardians

Do not encode assumptions such as “Owner means adult” or “Reviewer means parent” into the core authorization model.

If privacy/age requirements determine that a parent, guardian, educator, or organization must provide consent or hold specific authority, model that as an explicit relationship/policy layered onto the internal Actor system.

A later privacy/age ADR must define when such a relationship is required, how consent is recorded, and what rights it grants. This ADR only ensures the Actor model can support that extension.

## Options considered

### Option A — Trust identity-provider roles/groups as project authorization

**Summary:** Let the authentication provider own both identity and application roles.

**Advantages:**

- Less application authorization data.
- Can be convenient in a single-organization enterprise environment.

**Disadvantages:**

- Couples Wayfound project authority to one identity provider.
- Poor fit for personal, family, school, hobby, and multi-organization projects.
- Provider groups rarely express per-project ownership cleanly.

**Risks:**

- Replacing the provider can become a data-authority migration.
- External directory administrators could accidentally control product-specific approval semantics.

### Option B — Store project roles in the browser/client

**Summary:** Keep role state with the project UI and trust the client to send allowed actions.

**Advantages:**

- Very simple prototype behavior.

**Disadvantages:**

- Not a security boundary.
- Easy to tamper with.
- Cannot support trustworthy approvals or auditability.

**Risks:**

- A user or compromised client can forge privileged transitions.

### Option C — External authentication + Wayfound-owned Actors and project capabilities

**Summary:** Authentication provider proves identity; Wayfound maps it to an internal Actor and enforces project-scoped capabilities server-side.

**Advantages:**

- Clear separation of authentication and authorization.
- Provider-independent historical identity.
- Works for solo and collaborative projects.
- Allows explicit human vs non-human authority.
- Supports precise approval and deletion permissions.
- Can later accommodate guardian/organization relationships without redefining project records.

**Disadvantages:**

- Wayfound must maintain membership and authorization logic.
- Permission UX and invitation/recovery flows become product responsibilities.

**Risks:**

- Overly complex capability design could burden an initially simple product.
- Poor ownership-transfer/recovery design could lock users out of projects.

## Rationale

Option C preserves the architecture boundary selected in ADR-0001 and the exact-revision approval model proposed in ADR-0002.

Authentication providers are good at proving identity. They should not silently become Wayfound's project-authorization database. A stable internal Actor lets Wayfound preserve historical authorship and project authority even if a user changes email, adds another login method, or the product changes identity providers later.

Capabilities provide a precise server-side enforcement model, while small role bundles keep the experience understandable for users. Separating human and non-human Actors ensures future AI assistance can participate in work without acquiring human approval authority by accident.

## Consequences

### Positive

- Approval can be bound to a verified human Actor and exact artifact revision.
- Identity-provider replacement is less disruptive.
- AI/tool actors cannot masquerade as ordinary human project owners.
- Per-project collaboration is possible without enterprise directory assumptions.
- Permission changes become auditable.
- Future guardian/organization relationships have a stable Actor model to attach to.

### Negative

- Wayfound must implement membership, invitations, ownership transfer, and permission errors.
- Identity recovery and account-linking behavior require careful product design.
- Hosted production now depends on an authentication service even though the provider is not selected here.

### Neutral or accepted constraints

- Exact login methods, identity provider, MFA policy, passwordless behavior, and account-recovery UX remain later decisions.
- Exact role names may change; server capabilities are the durable enforcement concept.
- Self-approval is neither required nor prohibited by this ADR.
- Age/guardian policy remains separate and unresolved.

## Reversibility

The external authentication provider remains replaceable if project state references internal Actor IDs rather than provider subjects.

Changing role names or bundles is low-to-moderate cost if capabilities are stable. Replacing the capability model entirely after production adoption would be more expensive because authorization semantics appear in APIs, audit records, tests, and user expectations.

## Validation

Before this ADR can move from Proposed to Accepted, validate at least these scenarios in the first production-capable design/prototype:

1. an authenticated human creates a project and becomes its Owner
2. Owner grants a Builder access
3. Builder can edit/propose but cannot approve
4. Reviewer/Owner with `artifact.approve` can approve an exact eligible revision
5. Viewer cannot perform authoritative writes
6. browser-tampered role/capability data does not bypass server checks
7. a revoked Actor is denied on the next authoritative request
8. an AI/service Actor can produce a Draft suggestion but cannot approve it
9. audit metadata identifies the internal Actor for membership and approval transitions
10. replacing or linking an external identity does not change historical Actor IDs

## Reconsideration triggers

Revisit this decision if:

- Wayfound becomes permanently single-user/local-only
- product scope explicitly delegates authorization to one organization's external directory
- a different model demonstrates simpler project authority without weakening approval identity, non-human separation, or provider replaceability
- age/consent requirements impose an authority model that cannot be represented as Actor relationships and capabilities

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- Requirement: WF-016 — Review actionable draft artifacts without implying approval
- Architecture section: Security architecture; Data model and authority
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial identity/authorization proposal for durable project state and formal approval |
