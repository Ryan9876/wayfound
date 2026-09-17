# Architecture Decision Records

Wayfound uses Architecture Decision Records (ADRs) for consequential technical decisions that change system boundaries, authoritative data ownership, security/identity, persistence, deployment, foundational technologies, or other expensive-to-reverse constraints.

## Status model

ADR status values:

- **Proposed** — documented for review; not yet authoritative.
- **Accepted** — approved architecture direction.
- **Superseded** — replaced by a later ADR.
- **Deprecated** — still present historically but no longer recommended for new work.
- **Rejected** — considered and explicitly not selected.

An ADR may remain as the original proposal document while a later accepted ADR records package-level acceptance or selection. In that case, the later ADR is the authoritative acceptance record and the earlier ADR remains decision history.

## Current Wayfound runtime architecture

**ADR-0009 is the current authoritative runtime decision.**

Wayfound is local-first by default:

- Next.js + TypeScript local application/server boundary
- stable local human Actor; no account required for normal local use
- local SQLite durable project store
- Ollama and LM Studio as first-class local AI adapters
- external AI providers optional and explicitly opt-in
- Wayfound-owned project authorization and lifecycle rules
- immutable revisions, exact trace links, optimistic concurrency, and explicit domain commands
- hosted Vercel/PostgreSQL/Neon/Clerk adapters optional for future hosted/team mode

ADR-0009 supersedes ADR-0007 for the default hosting, persistence, identity, and AI-runtime choices. ADR-0007 remains the historical record of the prior hosted-first interpretation. The architecture boundaries developed in ADR-0001 through ADR-0006 remain authoritative where ADR-0009 does not replace their infrastructure assumptions.

ADR-0008 remains useful as the explicit PostgreSQL access decision for optional hosted compatibility; it does not define the default local M2 store.

## ADR rules

- State the decision first.
- Record alternatives and material tradeoffs.
- Preserve rejected/superseded options when they help explain why the accepted architecture exists.
- Identify reversibility and reconsideration triggers.
- Link affected requirements, architecture sections, and delivery milestones.
- Do not hide unresolved product or legal policy inside an ADR; keep it explicit as a dependency or open decision.
- Do not let framework/provider convenience silently redefine Wayfound's domain authority.

## File naming

Use a four-digit sequence followed by a short kebab-case title, for example:

`0009-local-first-runtime.md`

Use `0000-template.md` as the starting structure.
