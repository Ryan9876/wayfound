# ADR-0007: Production stack selection

**Status:** Accepted

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Adopt the M1 production architecture boundaries described in ADR-0001 through ADR-0006 and implement Wayfound's first production-capable architecture with the following concrete stack:

- **Application framework:** Next.js with TypeScript
- **Application hosting and preview environments:** Vercel
- **Relational database:** Neon PostgreSQL
- **Authentication provider:** Clerk
- **Project authorization:** Wayfound-owned Actor, membership, role/capability, and approval rules stored and enforced by the Wayfound application
- **Authoritative state transitions:** server-side Wayfound domain/application code only
- **AI and external-tool access:** server-side adapters only; providers remain replaceable and non-authoritative

Use Next.js as one deployable modular application boundary initially. Keep domain logic separate from page, route, database, identity-provider, and AI-provider adapters so the selected vendors can be replaced without redefining Wayfound's project model.

Do not expose direct browser writes to authoritative lifecycle fields such as `approved`. Consequential commands must pass through Wayfound server-side authorization, validation, concurrency, traceability, and transaction rules before PostgreSQL is changed.

This decision accepts the architecture constraints and tradeoffs proposed in ADR-0001 through ADR-0006 as the M1 production baseline. Their detailed rationale remains part of the decision record.

## Context

Wayfound's validated prototype now covers:

`idea → adaptive Interview → typed Records → Draft artifacts → Draft / Proposed / Set aside review`

The project owner has approved moving forward with the recommended Wayfound architecture rather than continuing to evaluate alternative production-stack families.

The prior M1 ADRs deliberately selected boundaries before vendors. With those boundaries understood, the project now needs a concrete stack so implementation can proceed without repeatedly reopening framework, hosting, database, and authentication choices.

Wayfound must still preserve the central governance rule established by the prototype: generated content, browser state, and AI output do not become project truth merely because they exist. Authoritative project changes require explicit domain transitions.

## Decision drivers

- Keep the first production implementation understandable and relatively small.
- Use one primary application language across browser and server code.
- Preserve a strict server-side authority boundary.
- Use ordinary relational PostgreSQL semantics for revisions, traceability, transitions, and concurrency.
- Keep authentication separate from Wayfound's project authorization rules.
- Keep AI/model providers replaceable.
- Support preview deployments and safe promotion without creating a separate frontend/backend deployment topology initially.
- Avoid direct browser-to-database mutation for consequential project state.
- Keep the architecture maintainable by people using AI-assisted development who may not be specialists in multiple programming languages.
- Avoid committing to an ORM, AI provider, observability vendor, or other implementation detail before the first production slice proves what is needed.

## Selected stack

### Next.js + TypeScript

Use Next.js for the browser application and server-side HTTP/application boundary.

Wayfound must keep these concerns separate inside the application:

- presentation/UI
- HTTP route/request handling
- application commands and queries
- domain rules
- authorization
- persistence adapters
- identity adapter
- AI/tool adapters

Next.js is the deployment framework, not the domain model. Domain code should not require Next.js-specific request objects or page lifecycle behavior to express project rules.

### Vercel

Use Vercel for the initial application deployment and preview-environment workflow.

Production promotion must still satisfy ADR-0006: immutable build identity, explicit database-migration handling, environment separation, and a defined rollback path. A Vercel deployment becoming available does not by itself mean a Wayfound release is approved.

### Neon PostgreSQL

Use Neon-hosted PostgreSQL for the relational project store.

The schema will follow ADR-0002:

- normalized current logical state
- immutable content revisions
- exact revision-to-revision trace links
- append-only transition/audit metadata
- optimistic concurrency for consequential state
- transactional state/revision/trace/transition writes

Wayfound will use application-owned identifiers and ordinary PostgreSQL contracts so the domain model is not tied to Neon-specific object identities.

### Clerk

Use Clerk to authenticate users and provide external identity assertions.

Clerk does **not** become Wayfound's source of project authorization truth. Wayfound will map authenticated identities to internal Actors and enforce project membership/capabilities itself.

For example, a Clerk-authenticated user may map to `ACT-123`, while Wayfound decides whether `ACT-123` has `artifact.approve` in `PROJ-456`.

This preserves ADR-0003 and keeps future identity-provider replacement feasible.

## Authority path

Consequential writes follow this shape:

```text
Browser
  │
  │ domain command + expected revision/version
  ▼
Next.js server boundary
  │
  ├─ authenticate through Clerk adapter
  ├─ map identity → Wayfound Actor
  ├─ authorize project capability
  ├─ validate domain transition
  ├─ verify expected revision/version
  ├─ create immutable revision / trace links
  ├─ append transition metadata
  └─ commit one database transaction
          │
          ▼
    Neon PostgreSQL
```

A browser client must not be able to turn a proposal into an approval by directly changing a database row or submitting arbitrary lifecycle state.

## AI/tool boundary

The first production-capable slice does not require external AI.

When AI or external tools are introduced later:

- calls execute through server-side adapters
- provider credentials remain server-side
- provider/model choice is not embedded in authoritative domain objects unless needed for provenance
- model output returns as a suggestion/result, not a direct database mutation
- any material state transition still passes through the same Wayfound command/authorization path

No AI provider is selected by this ADR.

## Database access boundary

The exact SQL access library or ORM remains an implementation decision.

Regardless of library choice:

- privileged writes occur server-side
- transactions must cover authoritative state + revision + trace + transition metadata when required
- schema migrations are explicit and versioned
- domain invariants are not delegated solely to client code
- vendor-specific features should not become the only representation of core Wayfound relationships without a separate ADR

## Options considered

### Option A — Next.js + Vercel + Neon + Clerk

**Summary:** One TypeScript application boundary, separate PostgreSQL database service, separate authentication provider, Wayfound-owned project authorization.

**Advantages:**

- One primary application language.
- Clear separation of application, database, and identity concerns.
- Strong fit with the accepted server-authority model.
- Straightforward preview deployment workflow.
- Ordinary PostgreSQL relational model.
- Identity and database providers remain independently replaceable.

**Disadvantages:**

- Multiple managed services must be configured and understood.
- Wayfound must implement its own project authorization and domain transitions instead of relying on a platform's direct database client model.

**Risks:**

- Framework convenience could leak into domain logic if module boundaries are not enforced.
- Managed-service pricing/limits must be reviewed before production scale.

### Option B — Next.js + Vercel + Supabase

**Summary:** Consolidate Postgres, authentication, and related backend services in Supabase.

**Advantages:**

- Fewer vendors.
- Fast application setup.
- Strong integrated database/auth tooling.

**Disadvantages:**

- The easiest browser-to-database patterns do not match Wayfound's preferred server-command authority model for consequential state.
- Database/auth/platform concerns become more coupled.

**Risks:**

- Convenience could encourage direct client persistence that bypasses Wayfound's domain transition boundary.

### Option C — React + ASP.NET Core + PostgreSQL

**Summary:** Separate React frontend and .NET backend with PostgreSQL.

**Advantages:**

- Very strong explicit API/domain separation.
- Mature enterprise authorization/backend ecosystem.
- Good fit for conventional enterprise deployment models.

**Disadvantages:**

- Two primary application languages and usually two deployment surfaces.
- More operational and maintenance overhead for the first Wayfound production slice.

**Risks:**

- Additional complexity may not provide enough benefit at Wayfound's current scale.

### Option D — React + FastAPI + PostgreSQL

**Summary:** Separate React frontend and Python backend with PostgreSQL.

**Advantages:**

- Strong Python ecosystem for future AI/ML work.
- Explicit backend boundary.

**Disadvantages:**

- Two application languages and separate deployment surfaces.
- Python's AI ecosystem is not itself a reason to place Wayfound's entire domain backend in Python.

**Risks:**

- Future AI needs could over-influence the core project-state architecture.

## Rationale

Option A provides the best balance for the current Wayfound product: strong server-side authority, ordinary PostgreSQL persistence, a replaceable identity provider, one primary application language, and a simple initial deployment topology.

It also reinforces the most important part of the accepted architecture: Wayfound owns the domain. Vercel does not own release approval, Neon does not own project lifecycle rules, Clerk does not own Wayfound project authorization, and future AI providers do not own project truth.

The selected tools are implementation infrastructure around an application-owned project model.

## Consequences

### Positive

- The first production application can use TypeScript end-to-end.
- Server authority and domain-command behavior remain explicit.
- PostgreSQL supports the revision/traceability model without inventing custom storage infrastructure.
- Authentication is available without making authentication-provider roles the Wayfound authorization model.
- Preview and production deployment can use one application hosting platform initially.
- Future AI/provider integrations remain server-side and replaceable.

### Negative

- Wayfound now depends operationally on Vercel, Neon, and Clerk for the initial production implementation.
- The team must understand configuration and failure modes across multiple managed services.
- A migration would still require work even though the domain boundaries are provider-independent.

### Neutral or accepted constraints

- The production implementation should begin as a modular monolith, not microservices.
- External AI is not required for the first hosted slice.
- ORM/query library remains TBD until schema implementation work begins.
- Observability provider remains TBD.
- Numeric availability/RPO/RTO/SLA targets remain TBD until product context justifies them.
- Privacy, retention, deletion, consent, and younger-user eligibility requirements still gate storage of real hosted user content.

## Reversibility

Framework/provider replacement is expected to be possible but not free.

Reversibility is protected by:

- application-owned IDs
- provider adapters
- Wayfound-owned authorization/capability model
- standard PostgreSQL relational contracts
- domain logic separated from Next.js route/page code
- explicit schema migrations
- no direct AI/provider ownership of authoritative state

Revisit provider choices independently rather than reopening the entire architecture whenever possible.

## Validation

Before the first production-capable release, verify that this stack can demonstrate:

- authenticated sign-in through Clerk mapped to a stable Wayfound Actor
- a project persisted in Neon PostgreSQL and reopened after browser/session loss
- all consequential project writes routed through server-side Wayfound commands
- a Draft artifact proposed without becoming Approved
- a permitted human Actor approving an exact immutable revision through a distinct command
- stale version/revision writes rejected rather than silently overwritten
- revision-to-revision trace links queryable from PostgreSQL
- transition/audit metadata committed atomically with the authoritative state change
- a Vercel preview build cannot accidentally operate on production project data
- production migration and rollback procedures tested before release

## Reconsideration triggers

Revisit this stack if:

- cost or service limits materially conflict with approved product requirements
- privacy/residency requirements cannot be satisfied by the chosen managed-service configuration
- Wayfound becomes intentionally local-only rather than hosted
- measured workload requires architecture unavailable in the selected deployment model
- identity requirements materially exceed Clerk's fit
- Neon/PostgreSQL no longer satisfies the relational/transactional persistence model
- Next.js/Vercel creates unacceptable coupling or operational constraints
- enterprise deployment requirements make a .NET or other self-hosted backend materially more suitable

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- ADR-0003 — Identity and project authorization
- ADR-0004 — Privacy, retention, and age boundary
- ADR-0005 — Application API and AI/tool boundary
- ADR-0006 — Deployment, migrations, and rollback
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Accepted | Project owner approved the recommended Wayfound architecture and concrete production stack |
