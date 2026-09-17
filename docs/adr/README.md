# Architecture Decision Records

Wayfound uses Architecture Decision Records (ADRs) for consequential technical decisions that change system boundaries, authoritative data ownership, security/identity, persistence, deployment, foundational technologies, or other expensive-to-reverse constraints.

## Status model

ADR status values:

- **Proposed** — documented for review; not yet authoritative.
- **Accepted** — approved architecture direction.
- **Superseded** — replaced by a later ADR.
- **Deprecated** — still present historically but no longer recommended for new work.
- **Rejected** — considered and explicitly not selected.

An ADR may remain as the original proposal document while a later accepted ADR records package-level acceptance or selection. In that case, the later ADR is the authoritative acceptance record and the earlier ADR's status history should link to it.

## Current M1 production architecture

ADR-0007 is the formal acceptance record for the Wayfound M1 production architecture. It accepts the architecture constraints and tradeoffs developed in ADR-0001 through ADR-0006 and selects the concrete initial stack:

- Next.js + TypeScript
- Vercel
- Neon PostgreSQL
- Clerk authentication
- Wayfound-owned project authorization and domain rules
- server-side, replaceable AI/tool adapters

ADR-0001 through ADR-0006 remain part of the decision history and detailed rationale. Their constraints are authoritative through ADR-0007 unless a later ADR supersedes them.

## ADR rules

- State the decision first.
- Record alternatives and material tradeoffs.
- Preserve rejected options when they help explain why the accepted architecture exists.
- Identify reversibility and reconsideration triggers.
- Link affected requirements, architecture sections, and delivery milestones.
- Do not hide unresolved product or legal policy inside an ADR; keep it explicit as a dependency or open decision.
- Do not let framework/provider convenience silently redefine Wayfound's domain authority.

## File naming

Use a four-digit sequence followed by a short kebab-case title, for example:

`0008-example-decision.md`

Use `0000-template.md` as the starting structure.