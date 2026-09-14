# ADR-0005 — Single-human + AI product model

**Status:** Accepted  
**Date:** 2026-09-13  
**Decision owner:** Product owner

## Decision

Wayfound first-version product scope is a **single-human software-delivery workspace assisted by AI**.

One authenticated human product owner controls the workspace and makes project-direction decisions. AI may draft, analyze, recommend, review, summarize, and identify risk, but AI output is advisory and must remain distinguishable from owner-approved records and from independent verification evidence.

Multi-human collaboration is not required for the first version. Wayfound will not require collaborator membership, invitations, human work assignment, reviewer-code exchange, or specialist accounts in the active first-version experience.

## Context

Earlier validated Increment 2 slices implemented assignment-scoped authenticated human specialist review for artifacts, consequential technical choices, and consequential technical requirements. Those slices proved several useful authority and record-integrity properties, including exact-revision review, separation of review from owner acceptance, audit history, tenant isolation, and stale-review handling.

The product owner has now clarified that Wayfound is intended for one person working with AI. Human collaboration features would add workflow, authorization, and interface complexity that is not required for the intended use.

## Consequences

### Active product behavior

- One authenticated human owner is the first-version human actor.
- The owner remains the final authority for product direction and release decisions.
- AI output is advisory and must identify its source or execution context when it becomes a durable record.
- AI recommendations do not automatically become approved requirements, accepted decisions, verification results, validation results, release readiness, or production authorization.
- The active interface must not require a second human account to complete ordinary project work.
- Human specialist assignment and reviewer-code controls are hidden from single-user test mode.
- Handoffs that exist only to coordinate another Wayfound user are outside active first-version scope.

### Preserved implementation

The existing authenticated specialist-review schema, commands, validation records, and tests remain in the repository as validated historical capability. This ADR does not rewrite past validation evidence and does not claim that AI review has replaced qualified independent human review.

The preserved capability may support a future optional collaboration mode if the product owner later approves that scope.

### Deferred design

A later slice may define durable AI-review records. That design must specify at least:

- model or tool identity;
- input/context boundary;
- exact target revision;
- requested review purpose;
- output/findings;
- confidence or uncertainty where useful;
- owner disposition;
- relationship to objective verification evidence.

AI review must not be labeled as independent qualified human review unless a human actually performed that review.

## Superseded assumptions

This ADR supersedes first-version assumptions that require invited collaborators, specialist reviewer accounts, reviewer-code exchange, collaborator administration, or human work assignment.

Existing architecture and validation documents that describe those implemented specialist flows remain accurate descriptions of what was built and validated. They are not the active first-version product requirement after this ADR.

## Reconsideration trigger

Revisit this ADR only if the product owner explicitly requires another human to participate inside the Wayfound workspace rather than outside it.