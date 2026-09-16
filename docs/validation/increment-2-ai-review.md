# Increment 2 — Durable AI work review validation

**Status:** Validated

**Date:** 2026-09-14

**Validated application head:** `dc819b65d42a1bc57e4eb7115ce5ed53bafcbca4`

**CI:** run 329 — https://github.com/Ryan9876/wayfound/actions/runs/34873606977

## Result

The bounded durable AI work-review slice passed its focused acceptance gate and the complete durable regression chain. The current authenticated workspace owner can request advisory local-AI review of one exact `Implemented` work-item revision, retain the bounded input snapshot and provider/model provenance with the result, and record one explicit owner disposition without changing implementation, verification, stage, release, or other project-authority state.

Focused result:

> PASS: durable AI work review preserves exact target provenance, uses loopback local inference, remains advisory, records one owner disposition, denies invalid/foreign/revoked paths, preserves idempotency/concurrency/rollback, survives re-login, and keeps project verification/release state unchanged.

## Executed evidence

Run 329 applied the complete migration history, including `20260914143000_durable_ai_work_review.sql`, on a fresh isolated Supabase stack.

The CI run passed:

- database security advisor with no errors;
- TypeScript and optimized production build;
- prototype, accessibility, single-user-mode, local-AI connection contract, workspace-guidance, keyboard, responsive, and route-boundary checks;
- durable workspace, evidence, artifact, artifact acceptance, specialist review, owner work lifecycle, work implementation completion, consequential technical decision, consequential technical requirement, and automatic single-user owner-session regressions;
- the dedicated durable AI-review suite.

The focused AI-review suite directly proved:

- only the current owner's exact current `Implemented` work revision can create a review request;
- request creation persists a stable review ID, exact target revision, target snapshot, purpose, owner/release/stage context, context boundary, and `Pending` state before inference;
- proposed work, stale revision, other-owner, cross-workspace, revoked-membership, and direct protected-table paths are denied;
- identical review-request replay returns the original review while changed-payload reuse fails;
- the server invokes the supported loopback LM Studio contract for the bounded work-record prompt and records returned provider/model identity plus available token/performance metrics;
- the model instruction explicitly limits inspection claims and forbids treating the result as verification;
- local inference failure becomes a durable `Failed` review without creating a project finding or changing project authority state;
- a completed review can receive exactly one owner disposition of `Use as input`, `Needs follow-up`, or `Do not use` with a non-empty note and explicit confirmation;
- failed reviews cannot receive a disposition;
- identical disposition replay is idempotent, changed-payload reuse fails, and concurrent distinct dispositions produce one durable winner;
- injected audit failure rolls back the disposition and its idempotent request result, after which the same request can succeed;
- saved review output and disposition survive provider unavailability and sign-out/re-login;
- review completion and owner disposition leave work, requirement, evidence, artifact, stage, and release snapshots unchanged.

The acceptance test required three test-only corrections before run 329: a case-insensitive advisory-text assertion and two locator-scope fixes where multiple valid historical review cards made global text selectors ambiguous. Those changes corrected the test harness only; application and database behavior did not change.

## Rendered inspection

Run 329 uploaded `workspace-screenshots` artifact **10360355725**, 32,717,711 bytes, SHA-256 `d828cc8f988843e0c9e891fa18b4c0a8129955f21f359881696fb1d940f33f1b`. The downloaded ZIP digest was independently checked and matched the Actions artifact digest. The artifact contained 64 files.

Rendered screenshots inspected:

- `ai-review-disposition-desktop.png` — 1440 px wide; the implemented work record shows the AI-review section, local provider/model state, bounded purpose and context, generated advisory result, explicit “advisory AI analysis, not verification” text, provider provenance disclosure, failed-review treatment, and saved owner dispositions.
- `ai-review-disposition-mobile.png` — 390 px wide; the same review and disposition information remains readable, mobile project navigation remains available, and the automated overflow assertion passed.

The focused browser flow also stopped the local model after saving the review, reloaded the page, confirmed that the review action was unavailable while local AI was offline, confirmed the saved disposition remained visible, and then confirmed persistence after re-login.

## Authority and recovery limits

An AI review is advisory analysis. It does not approve or alter the reviewed work, create verification evidence, satisfy an acceptance criterion, approve a requirement, accept a decision or artifact, complete or reopen a stage, validate a release, establish production readiness, authorize deployment, or authorize another production-changing action.

The active provider boundary remains loopback-only: LM Studio at `127.0.0.1:1234` and Ollama at `127.0.0.1:11434`. No cloud/public fallback is established by this slice.

The migration is additive. Application rollback may leave durable AI-review rows unreadable by older code. During rollback, disable incompatible AI-review mutations and retain the database rows; prefer a forward fix over destructive data rollback.

No hosted persistence environment, production restore evidence, production deployment, or release authorization is established by this CI run.

## Reconciliation state

This record validates application behavior at `dc819b65d42a1bc57e4eb7115ce5ed53bafcbca4` through CI run 329. Documentation and PR reconciliation follow in a later repository commit and require their own exact-head CI pass. PR #1 remains open, draft, unmerged, and not Released.
