# Wayfound Architecture Decision Records

Architecture Decision Records (ADRs) preserve consequential technical decisions and the reasoning behind them.

## When to create an ADR

Create an ADR when a decision:

- changes a system or ownership boundary
- selects or replaces a foundational technology
- changes authentication or authorization
- changes the authoritative source for important data
- introduces a significant external dependency
- changes deployment, rollback, or migration behavior materially
- accepts a consequential security, reliability, cost, or maintainability tradeoff
- is expensive to reverse

Do not create an ADR for ordinary implementation details that can change locally without affecting a durable project boundary.

## Naming

Use four-digit sequential identifiers:

- `0001-short-decision-name.md`
- `0002-short-decision-name.md`

Copy `0000-template.md` when creating a new ADR.

## Status

Use:

- **Proposed** — under review
- **Accepted** — approved and authoritative
- **Superseded** — replaced by another ADR
- **Rejected** — considered but not selected
- **Deprecated** — still relevant temporarily but scheduled to stop governing new work

Do not delete an accepted ADR because a later decision replaces it. Mark it `Superseded` and link the replacement.

## Index

| ADR | Decision | Status | Date | Superseded by |
| --- | --- | --- | --- | --- |
| [0001](0001-web-application-foundation.md) | Web application foundation | Accepted | 2026-09-13 | — |
| [0002](0002-durable-workspace-identity.md) | Durable workspace identity and persistence | Proposed | 2026-09-13 | — |

## Change rule

When an ADR status changes, update this index in the same change.