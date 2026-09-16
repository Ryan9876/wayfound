# Increment 2 — Consequential technical decision validation

**Status:** Validated

**Date:** 2026-09-13

**Validated application head:** `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b`

**CI run:** [201](https://github.com/Ryan9876/wayfound/actions/runs/34790448518)

## Result

Consequential technical-choice proposal, exact-revision specialist review, and separate owner acceptance passed real Supabase/PostgreSQL and built Next.js acceptance tests. The complete prior durable regression chain passed. Both CI jobs completed successfully. Increment 2 remains In progress; this is its tenth Validated bounded slice.

Exact focused result:

> PASS: consequential technical choices preserve split authority; exact-revision specialist review gates separate owner acceptance; blocking/advisory findings, stale revisions, tenant/session/membership violations, direct-table access, duplicate/concurrent requests, injected audit failure, restart/re-login, database interruption/recovery, keyboard access, and desktop/390 px rendering passed.

## Executed evidence

Run 201 applied migration `20260913231500_technical_decision_authority.sql`. The Supabase security advisor reported `No issues found`. TypeScript, production build, prototype structure, accessibility baseline, and keyboard checks passed.

The durable job passed, in sequence:

1. Durable workspace continuity and owner decisions.
2. Proposed work items and owner-approved product requirements/criteria.
3. Criterion evidence.
4. Proposed artifacts.
5. Artifact acceptance.
6. Assignment-scoped specialist artifact review.
7. Owner work lifecycle.
8. Consequential technical-decision authority.

The focused suite established:

- Proposal creation leaves the technical choice `Proposed` and creates no accepted technical decision.
- Proposal create replay returns the original result; changed request reuse fails.
- Unauthorized, cross-tenant, and unknown-target creation fails.
- A reviewer code identifies an authenticated specialist without workspace membership.
- Owner self-review is denied.
- Assignment snapshots the exact proposal revision, requested competence, and bounded question.
- An unassigned specialist cannot submit a review.
- `No blocking finding` records qualified specialist judgment but does not auto-accept project direction.
- The current owner must perform a separate acceptance action to create the linked accepted technical decision.
- Acceptance replay returns the original result; changed request reuse fails.
- `Advisory` does not satisfy the acceptance gate.
- `Changes required` blocks acceptance; no owner override exists in this slice.
- A material proposal revision makes the earlier review stale for acceptance.
- A fresh review of the revised proposal can enable acceptance.
- A specialist cannot submit against a stale assignment/revision.
- Concurrent distinct owner acceptance requests produce exactly one durable winner.
- Injected audit failure rolls back the mutation and request result; retry succeeds after the fault is removed.
- Direct private-table operations fail; RLS and protected mutation boundaries remain in place.
- Revoked owner membership, expired sessions, sign-out, and revoked live sessions fail as applicable.
- Restart and re-login preserve proposal, assignment, review, accepted-decision identity, and history.
- Another tenant cannot use the owner's records.
- Database interruption renders a recoverable workspace error; recovery restores the same committed records without fixture fallback.
- Existing no-fetch external-reference behavior remains covered by the prior artifact regression chain.

## Rendered review

Run 201 screenshot artifact:

- Name: `workspace-screenshots`
- Artifact ID: `10328410866`
- Digest: `sha256:4cee0ee67f15a6e51b9d587ff3c4795e5633c3ca49e863aa613e07bb519c845b`
- Size: 21,499,822 bytes
- [Artifact](https://github.com/Ryan9876/wayfound/actions/runs/34790448518/artifacts/10328410866)

The downloaded ZIP digest matched the recorded GitHub digest. The following generated screenshots were inspected directly:

- `technical-decision-proposed-owner-desktop.png`
- `technical-decision-proposed-owner-mobile.png`
- `technical-decision-specialist-reviewed-desktop.png`
- `technical-decision-specialist-reviewed-mobile.png`
- `technical-decision-accepted-owner-desktop.png`
- `technical-decision-accepted-owner-mobile.png`
- `technical-decision-database-unavailable.png`

Desktop and 390 px mobile inspection confirmed readable proposal, assignment, review, eligibility, acceptance, reviewer, and accepted-decision state. The owner and specialist workspaces remain visibly separate. `No blocking finding` is shown as qualified review rather than acceptance. The accepted owner view explicitly states that accepted project direction after qualified review does not establish verification, validation, release readiness, or production authorization. Long identifiers wrap without horizontal overflow. The database-unavailable view states that the saved record has not been replaced and provides recovery actions.

Normal UI regression artifact:

- Name: `ui-screenshots`
- Artifact ID: `10327826544`
- Digest: `sha256:aec89f8e21b06e58d3ea9e420fd2345eb1a1bad426ae92d148d45e73d1768722`
- Size: 1,588,120 bytes

## Authority and recovery limits

[ADR-0004](../adr/0004-technical-decision-review-and-acceptance.md) is the accepted authority basis. A technical choice remains a proposal until the separate owner acceptance action succeeds after a qualifying exact-revision specialist review.

`No blocking finding` is not verification. Specialist review does not accept project direction. Owner acceptance does not create independent technical verification, product validation, release readiness, release authorization, or production authorization.

Technical requirements remain future scope. Accepted technical-decision replacement/supersession, multiple mandatory specialist disciplines, formal waivers/disputes, dependency impact analysis, and production-changing actions remain future scope.

The migration preserves existing records. Recovery must retain the split authority model and exact-revision linkage; do not collapse proposal, review, and owner acceptance into one owner-only or specialist-only state.

Real backend execution used the existing isolated CI environment. No hosted services were provisioned.

CI screenshot artifacts use the repository's seven-day retention policy. The artifact IDs, digests, application head, run, and test source identify the executed evidence; this record does not imply indefinite artifact availability.

## Reconciliation

The slice specification, architecture, delivery plan, README, and local test instructions are reconciled with this behavior. PR #1 remains open, draft, and unmerged. Exact-head CI after documentation reconciliation must be confirmed separately; this record identifies the application acceptance run and does not predict a future run result.
