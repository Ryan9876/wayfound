# ADR-0003 — Assignment-scoped specialist review authority

**Status:** Accepted  
**Date:** 2026-09-13  
**Decision owner:** Ryan Smith

## Decision

Use assignment-scoped authorization for specialist review. Do not widen the existing owner-only workspace membership model in this slice.

An authenticated non-anonymous user can establish an internal Wayfound actor identity and receive a stable reviewer code. The reviewer code does not grant workspace access. A current workspace owner can use that code to assign one qualified specialist to review one exact artifact version that is currently accepted as project direction. The assignment states the requested competence area and one bounded review question.

Only the assigned authenticated specialist can submit the review. The specialist records their display name, competence statement, review conclusion, summary, and findings. The review remains linked to the exact artifact/version and snapshots the artifact and version revisions at review time.

A specialist review is qualified judgment within its declared scope. It is not verification evidence, a release authorization, production authorization, or a product-owner decision. Recording a review does not alter artifact acceptance, requirement state, acceptance-criterion state, evidence state, or release lifecycle.

## Context

The approved product baseline distinguishes product-owner authority from qualified specialist review. The first version requires named reviewer records and must not make reviewed work appear verified without current evidence.

The existing durable workspace implementation stores only `owner` rows in `wayfound.memberships`. Existing owner mutation functions use `wayfound.member(workspace_id)` as their authorization predicate. That helper tests membership existence, not a specific role. Expanding that table to include specialists without first changing every owner mutation would allow a specialist membership to satisfy owner-only mutation checks.

That privilege expansion is not acceptable. The specialist-review slice therefore uses a separate assignment table and exact-resource authorization instead of adding a specialist workspace membership.

## Authority model

The owner can:

- assign a reviewer code to the exact currently accepted artifact version;
- state the requested competence area;
- state the bounded review question;
- read the resulting named specialist review.

The assigned specialist can:

- read only review assignments addressed to their authenticated actor;
- read only the bounded artifact metadata included with those assignments;
- submit one review for an incomplete assignment;
- state their own name and competence for that review.

The specialist cannot gain owner workspace access from the assignment. The specialist cannot create owner decisions, owner requirements, owner work items, owner evidence, artifact acceptance, or any other owner-scoped record unless a later approved authorization model explicitly grants that capability.

The reviewer code is an internal actor UUID. It is an addressing token, not a secret or an authorization credential. Possession of a reviewer code does not confer access; every protected operation derives the authenticated actor from the live Supabase session and verifies the stored assignment.

## Review conclusion

This slice uses three specialist-review conclusions:

- `No blocking finding` — within the declared review scope, the specialist did not identify a finding that blocks the reviewed direction.
- `Changes required` — within the declared review scope, the specialist identified one or more findings that require change before the reviewed direction should proceed.
- `Advisory` — the specialist recorded relevant guidance or observations without making a blocking/non-blocking judgment.

These conclusions do not mean `Verified`, `Validated`, or `Released`.

## Persistence and security

Keep specialist-review tables in the private `wayfound` schema with row-level security enabled as defense in depth and no direct client table grants.

Use narrowly scoped private `SECURITY DEFINER` functions with `search_path = ''`, fully qualified object names, live-session validation through `wayfound.subject()`, and explicit authorization checks. Expose only public `SECURITY INVOKER` wrappers with `EXECUTE` granted to `authenticated` and revoked from `PUBLIC` and `anon`.

Do not use user-editable JWT metadata for reviewer authorization. Do not add an application service key.

The existing bounded retry remains limited to exact PostgREST `PGRST303` with message `JWT issued at future`.

## Identity and invitation boundary

Public signup, production invitations, account recovery, email-based member lookup, and hosted account administration remain outside this slice. Local and CI validation can explicitly provision test identities under ADR-0002.

A production invitation or collaborator-membership workflow requires a separate approved design because it changes account lifecycle and workspace authorization.

## Failure and concurrency

Assignment and review submission are transactional and idempotent by authenticated actor plus request UUID.

- Repeating the same request with identical input returns the original result.
- Reusing a request UUID with changed input fails.
- An audit-write failure rolls back the full mutation.
- A completed assignment cannot receive a second review.
- If the target artifact/version is no longer the currently accepted version when the specialist submits, submission fails rather than reviewing stale project direction as current.

A failed specialist-review operation must not alter the currently accepted artifact or other durable project state.

## Alternatives considered

### Add `specialist` to workspace membership now

Rejected for this slice. Existing owner mutations authorize through a generic membership predicate. Widening membership first would create an authorization escalation unless all owner commands were simultaneously redesigned and revalidated.

### Owner records a specialist review on the specialist's behalf

Rejected. It would make reviewer identity and qualified judgment caller-supplied rather than authenticated specialist action.

### Email-based invitation and specialist membership

Deferred. It adds account discovery, invitation lifecycle, membership administration, privacy considerations, and owner-role migration that are not required to prove the specialist-review boundary.

## Consequences

This design proves named specialist review and separation of duties without broadening owner authority. It deliberately provides narrower specialist access than the eventual collaborator/invitation model.

A later role/membership redesign can replace assignment-scoped access only after owner-only mutations use explicit role-aware authorization and migration/regression evidence shows no privilege expansion.

## Validation required

Validation must prove:

- reviewer identity creation grants no workspace membership;
- only a current owner can create a bounded assignment;
- assignments target the exact currently accepted artifact version;
- only the assigned live specialist session can submit;
- specialists cannot perform owner mutations on the assigned workspace;
- review submission does not change accepted artifact, requirement, criterion, evidence, or release state;
- idempotency, cross-tenant denial, session and revocation denial, rollback, restart/resume, and database-outage recovery;
- direct table access remains denied;
- external artifact references are not fetched;
- mobile, desktop, keyboard, and status-text behavior remain usable.

## Sources reviewed

Repository sources: `AGENTS.md`, `docs/PROJECT_CHARTER.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/GLOSSARY.md`, `docs/ARCHITECTURE.md`, `docs/DELIVERY_PLAN.md`, `docs/QUALITY.md`, and ADR-0002.

Current Supabase security guidance was rechecked on 2026-09-13. It continues to require explicit grants plus row-level security for exposed objects, cautions that `authenticated` alone is not authorization, and recommends keeping genuinely required security-definer functions outside exposed schemas with explicit access checks.

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-13 | Accepted | The project owner selected specialist review as the next bounded implementation area; this decision preserves the existing owner-only authority boundary while enabling authenticated specialist judgment. |
