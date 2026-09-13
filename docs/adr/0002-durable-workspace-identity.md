# ADR-0002 — Durable workspace identity and persistence

**Status:** Proposed  
**Date:** 2026-09-13  
**Decision owner:** Ryan Smith

## Proposed decision

Use Supabase Auth and managed PostgreSQL for the first authenticated workspace slice. Keep provider access in server-side adapters. Keep workspace authorization and deterministic transitions in Wayfound application services, with database access policies as defense in depth.

This is a recommendation, not approval to provision a service, purchase a plan, migrate data, or implement the identity boundary. The owner must approve the dependency and trust boundary first.

## Facts and assumptions

- ADR-0001 and ARCHITECTURE.md already select Next.js and PostgreSQL.
- The current application has fixture data and no identity provider or persistence adapter.
- Increment 2 requires authenticated ownership and durable state.
- Assumption: no existing identity-provider or hosting mandate applies. Reconsider this recommendation if one exists.

## Options and rationale

| Option | Benefit | Cost or risk |
| --- | --- | --- |
| Supabase Auth and PostgreSQL — recommended | One managed platform for identity and the approved relational store; documented Next.js integration | Provider availability affects sign-in and records; account, region, cost, and recovery responsibilities need explicit ownership |
| Separate managed identity provider and PostgreSQL host | Independent provider selection and replacement; fits an existing identity standard | Two service configurations and more identity-to-database integration work |
| Self-managed identity and PostgreSQL | Direct operating control | Wayfound's operator owns patching, identity security, availability, and recovery |

Interpretation: the first option is the smallest operating footprint for this bounded slice if there is no existing provider mandate. This is not a pricing or availability guarantee.

## Trust boundary and authority

The identity provider verifies identity. Wayfound maps a verified provider subject to an internal actor. Workspace membership is read from authoritative storage on every protected operation; user-editable identity metadata does not confer ownership.

Presentation calls application services. Services authenticate, validate input, check membership, and call the persistence adapter. Database policies restrict rows to workspace members. Ordinary requests must not use an unrestricted service key. Direct API access must not permit bypassing application invariants.

Use provider-supported server session handling. Validate sessions before protected data access; do not trust a client-supplied actor, workspace owner, cookie payload, or cached membership. Sign-out clears the application session. Authenticated responses must not enter shared caches. Mutation endpoints check request origin and use the framework's supported request protections.

AI has no write or authorization capability in this slice. CI results do not change workspace lifecycle or evidence state.

## Proposed implementation boundary

Begin with password sign-in for test accounts in an isolated development environment. Public signup, invitations, account recovery, and production email delivery remain later work within Increment 2. Local seed tooling must provision test identities explicitly and refuse production configuration.

Use the model and acceptance checks in [INCREMENT_2_SLICE.md](../INCREMENT_2_SLICE.md). Do not replace the Borrow Desk fixture with an empty database fallback. An unavailable persisted workspace shows a recoverable error.

## Consequences and reversibility

Structured project data remains in ordinary PostgreSQL tables. Provider identifiers are isolated in the identity mapping. Replacing the provider would require identity migration, new sessions, adapter changes, policy review, and regression tests. It is consequential even if the first dataset is disposable.

Before hosted deployment, identify the service account owner, region, plan, allowed redirect URLs, secret storage, recovery approach, and environment separation. These are not established by this proposal. No production recovery claim is valid until restore testing executes.

## Validation required after approval

Prove authenticated create, restart, sign-out, sign-in, and resume against real PostgreSQL. Prove cross-workspace denial, revoked membership denial, session expiry, atomic creation, duplicate retry handling, and database-outage behavior. Run the existing UI checks and inspect rendered screenshots. Preserve an explicit demo label and all 15 canonical stages.

## Sources reviewed

Official documentation reviewed on 2026-09-13:

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security

Recheck current provider APIs and security guidance before implementation. No provider package has been installed or service provisioned by this proposal.

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-13 | Proposed | Owner decision required for a new identity trust boundary and consequential provider dependency |
