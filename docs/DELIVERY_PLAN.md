# Wayfound Delivery Plan

**Status:** In progress

## 1. Delivery objective

Deliver Wayfound as validated vertical slices. Each slice must improve a complete user outcome and leave the repository coherent.

Do not build deferred automation before the core orientation, continuity, and evidence model is understandable to intended users.

## 2. Increment 1 — Foundation and orientation

**Status:** Validated

**Outcome:** A user can open the Borrow Desk prototype, understand the current release and stage, see one recommended next action with its reason, and move across the primary workspace areas.

**Included:** responsive desktop and mobile shell; Wayfound design tokens and logo direction; Overview dashboard; canonical 15-stage Journey; representative Work, Handoffs, Records, and Release & Care views; fixture data only.

**Evidence:** [Increment 1 validation record](validation/increment-1.md), application commit `4cbc8fddc092dc27ee3b59fddb039e42e7e3a1cf`, CI run 62. No independent user research or Released state is claimed.

## 3. Increment 2 — Durable workspace record

**Status:** In progress

**Outcome:** An authenticated owner can create and resume a workspace without relying on chat history and can progressively build durable project records inside it.

### Slice 1 — Create, list, open, and resume

**Status:** Validated

Ryan Smith approved [ADR-0002](adr/0002-durable-workspace-identity.md) for the development slice on 2026-09-13. The authenticated create/list/open/resume path passed real-backend and rendered acceptance tests at application commit `603f02862ae4090bd1853157e449a01508186f4c` through CI run 70. See the [slice plan](INCREMENT_2_SLICE.md) and [validation record](validation/increment-2-durable-workspace.md).

Validated scope includes Supabase authentication, workspace membership, PostgreSQL workspace/release/stage persistence, initial audit event, idempotent creation request, loading/empty/error states, tenant isolation, restart/resume behavior, and failure recovery.

### Slice 2 — Owner-authorized durable decisions

**Status:** Validated

An authenticated workspace owner can record an accepted product-scope or business decision after explicitly confirming product-owner authority. The decision persists with its rationale, stage, `Accepted` status, and `owner` authority. Consequential technical decisions remain outside this action and require qualified specialist review.

The slice passed real-backend and rendered acceptance tests at application commit `548f1bbb4264ca412bc808a94a60593bca2c3602` through CI run 92. See the [decision slice](INCREMENT_2_DECISIONS.md) and [validation record](validation/increment-2-decisions.md).

Validated scope includes transactional decision acceptance, audit record, idempotent retries, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, and mobile/desktop rendered review.

### Slice 3 — Owner-owned proposed work items

**Status:** Validated

An authenticated workspace owner can record bounded planned work with an outcome, completion condition, expected evidence, current stage, and explicit owner. New work items remain `Proposed`; recording them does not start execution, assign a specialist, or claim implementation, review, or verification.

The slice passed real-backend and rendered acceptance tests at application commit `1f2a1c99856119c845a4495b61674bea415a4a77` through CI run 113. See the [work-item slice](INCREMENT_2_WORK_ITEMS.md) and [validation record](validation/increment-2-work-items.md).

Validated scope includes transactional work-item creation, audit record, idempotent retries, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, explicit text status, and mobile/desktop rendered review.

### Remaining Increment 2 scope

Specialist-review decision flow; work-state transitions, collaborator/specialist assignment, work dependencies and links; durable requirement records; artifact records; evidence records; maintenance records; later lifecycle behavior; change-impact handling; and supporting audit/seed behavior remain In progress or unimplemented. No hosted project has been provisioned.

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

An increment is not `Validated` until its acceptance criteria and required checks have executed against an identified build. A validated bounded slice does not make its parent increment Validated when material approved scope remains unfinished. A preview deployment alone does not establish validation.
