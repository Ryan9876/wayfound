# Increment 2 — Durable work-item dependencies validation

**Status:** Validated

**Date:** 2026-09-14

**Validated application/test head:** `a3484c37199e0072b05eaf5f9979eff6406774b0`

**CI:** run 346 — https://github.com/Ryan9876/wayfound/actions/runs/34886563045

## Result

The bounded durable work-item dependency slice passed its focused acceptance gate and the complete durable regression chain. The current authenticated workspace owner can record that one work item depends on another same-workspace work item, view the relationship in both directions, and later remove the active dependency while preserving history. Dependency records remain separate from the explicit work lifecycle and do not automatically block, resume, complete, verify, validate, or release anything.

Focused result:

> PASS: durable work dependencies preserve an acyclic same-workspace graph and work-state independence; exact-target authority, idempotency, duplicate/cycle/concurrency denial, audit rollback, reversible history, revocation, re-login persistence, keyboard focus, and desktop/390 px rendering passed.

## Executed evidence

Run 346 applied the complete migration history, including `20260914190000_work_item_dependencies.sql` and `20260914190100_work_dependency_read_model.sql`, on a fresh isolated Supabase stack.

The CI run passed:

- database security advisor with no errors;
- TypeScript and optimized production build;
- prototype, accessibility, single-user-mode, local-AI connection contract, workspace-guidance, keyboard, responsive, and route-boundary checks;
- durable workspace, evidence, artifact, artifact acceptance, specialist review, owner work lifecycle, work implementation completion, durable AI work review, consequential technical decision, consequential technical requirement, and automatic single-user owner-session regressions;
- the dedicated durable work-dependency suite.

The focused dependency suite directly proved:

- only a current authenticated workspace owner can create or remove a work dependency;
- both work targets must exist in the exact workspace and must be different records;
- dependency creation stores a stable ID, both work IDs, both revisions at creation time, reason, creating actor, and creation time;
- the dependent read model exposes active **Depends on** relationships and the prerequisite read model exposes reverse **Needed by** relationships with current linked-work status;
- later work revision/status changes do not rewrite the saved creation-revision snapshots;
- dependency creation and removal do not change either work item's status or revision and do not mutate requirement, evidence, artifact, stage, or release authority state;
- self-dependency, duplicate active edges, unknown/cross-workspace targets, foreign owner, revoked membership, and direct protected-table writes are denied;
- direct and indirect cycles are rejected without changing the graph;
- concurrent opposite-edge requests cannot create a two-node cycle;
- concurrent same-edge requests produce one active durable dependency;
- create and remove operations preserve exact idempotent replay while rejecting changed-payload request-key reuse;
- injected audit failure rolls back dependency mutation and request-result state, after which the same normalized request can succeed;
- removal preserves the original dependency row and creation metadata while recording removing actor, reason, and time;
- an inactive dependency can later be replaced by a new durable dependency record between the same work items;
- active and removed dependency history survive sign-out/re-login;
- the focused browser path creates the link through the owner Work UI, displays both directions, confirms work status remains unchanged, checks keyboard focus, captures desktop and 390 px mobile screenshots, removes the dependency, and confirms it is no longer active.

Two failed CI attempts before run 346 exposed only test-locator ambiguity: work titles also appeared inside dependency selectors, and the words `Add dependency`/`Remove dependency` were shared by disclosure summaries and submit buttons. The final test scopes to stable work-card IDs and explicit `<summary>` elements. Those corrections changed the test harness only; the database and product behavior were already passing before the browser locator reached the rendered interaction.

## Rendered inspection

Run 346 uploaded `workspace-screenshots` artifact **10365252302**, 33,736,062 bytes, SHA-256 `ed263eee456fabefbd0d765f0d7922f7a26e9275d600e8f3c061f84e895fb171`. The artifact contains 66 files.

Rendered screenshots inspected:

- `work-dependency-desktop.png` — 1440 px wide; the Work view shows the prerequisite card with **Needed by**, the dependent card with **Depends on**, current linked-work status, the saved reason and creation revisions, explicit add/remove disclosures, and the text that dependency links do not automatically block, resume, or complete work.
- `work-dependency-mobile.png` — 390 px wide; the same dependency information remains readable, mobile navigation remains available, and the automated horizontal-overflow assertion passed.

The rendered evidence does not show color-only status communication and does not imply that the dependency itself changed work lifecycle state.

## Authority and recovery limits

A dependency is a durable relationship, not a lifecycle or readiness decision. This slice does not implement automatic blocking/resuming, dependency satisfaction, release-readiness calculation, impact propagation, or generic cross-record links.

The migration is additive. Application rollback may leave dependency records unreadable by older code. During rollback, disable incompatible dependency mutations and retain the database rows; prefer a forward fix over destructive data rollback.

No hosted persistence environment, production restore evidence, production deployment, release readiness, or release authorization is established by this CI run.

## Reconciliation state

This record validates application/test behavior at `a3484c37199e0072b05eaf5f9979eff6406774b0` through CI run 346. Documentation and PR reconciliation follow in later repository commits and require their own exact-head CI pass. Increment 2 remains In progress because broader durable links, multiple-criterion lifecycle, evidence freshness/verification decisions, maintenance, change-impact behavior, and supporting audit/recovery/seed work remain unfinished. PR #1 remains open, draft, unmerged, and not Released.
