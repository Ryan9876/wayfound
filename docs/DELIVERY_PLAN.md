# Wayfound Delivery Plan

**Status:** In progress

## 1. Delivery objective

Deliver Wayfound as validated vertical slices. Each slice must improve a complete user outcome and leave the repository coherent.

Do not build deferred automation before the core orientation, continuity, and evidence model is understandable to intended users.

## 2. Increment 1 — Foundation and orientation

**Status:** Validated

**Outcome:** A user can open the Borrow Desk prototype, understand the current release and stage, see one recommended next action with its reason, and move across the primary workspace areas.

**Included:**

- responsive desktop and mobile shell;
- Wayfound design tokens and logo direction;
- Overview dashboard;
- canonical 15-stage Journey view;
- Work, Handoffs, Records, and Release & Care representative views;
- fixture data only.

**Validation:**

- source/type checks when dependencies are available;
- desktop and mobile visual review;
- keyboard and contrast review;
- task test: identify current stage, next action, open assumption, and evidence state.

**Evidence:** [Increment 1 validation record](validation/increment-1.md), application commit `4cbc8fddc092dc27ee3b59fddb039e42e7e3a1cf`, CI run 62. Rendered review found and corrected mobile Records overflow. The orientation task walkthrough passed. No independent user research or Released state is claimed.

## 3. Increment 2 — Durable workspace record

**Status:** In progress

**Outcome:** An authenticated owner can create and resume a workspace without relying on chat history.

**Preparation:** Ryan Smith approved [ADR-0002](adr/0002-durable-workspace-identity.md) for the development slice on 2026-09-13. The first create/open/resume slice is Implemented; real-backend and rendered validation are In progress. See [slice plan](INCREMENT_2_SLICE.md). No hosted project has been provisioned.

**Expected scope:** authentication and workspace membership, PostgreSQL persistence, release/stage/decision/work/artifact/evidence/maintenance records, explicit lifecycle status, audit baseline, and seed/demo tooling.

## 4. Increment 3 — Versioned artifact import

**Status:** Proposed

**Outcome:** An owner can import revised specifications without losing or silently replacing the accepted version.

**Expected scope:** proposed artifact versions, accepted-version preservation, failed-import records, retry history, and a plain-English change summary or documented alternative comparison.

## 5. Increment 4 — Manual specialist handoff and reconciliation

**Status:** Proposed

**Outcome:** The owner can prepare a bounded specialist package, return with specialist output, and reconcile it against accepted scope and decisions.

**Expected scope:** handoff package generation, return intake, contradiction/open-question capture, acceptance by artifact or bounded change, and named reviewer records.

## 6. Increment 5 — Impact, readiness, release, and care

**Status:** Proposed

**Outcome:** Changes expose affected evidence, and a release can be reviewed against a concrete packet with named operating ownership.

**Expected scope:** dependency and impact records, outdated-evidence handling, requirement-to-criterion-to-evidence traceability, readiness view, release packet and scoped authorization, deployment outcome record, and maintenance due items.

## 7. Deferred roadmap

Do not include these items without an approved scope change: verified direct specialist connectors, automatic CI/CD evidence ingestion, automatic repository change analysis, scheduling integrations, portfolio reporting, or automatic production actions.

## 8. Completion rule

An increment is not `Validated` until its acceptance criteria and required checks have executed against an identified build. A preview deployment alone does not establish validation.
