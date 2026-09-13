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

### Slice 4 — Owner-approved product requirements

**Status:** Validated

An authenticated workspace owner can record an approved product requirement with a `MUST`, `SHOULD`, or `MAY` obligation and exactly one durable acceptance criterion. The requirement records current release/stage, owner authority, and stable identifiers. The criterion remains an observable condition and is explicitly not verification evidence.

The slice passed real-backend and rendered acceptance tests at application commit `9e2af6940ce4d440fed00825620e0b693eff17c2` through CI run 131. See the [requirement slice](INCREMENT_2_REQUIREMENTS.md) and [validation record](validation/increment-2-requirements.md).

Validated scope includes transactional requirement-and-criterion creation, explicit owner-authority confirmation, obligation validation, audit record, idempotent retries, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, stable identifiers, honest evidence language, and mobile/desktop rendered review.

Consequential technical implementation requirements remain outside this action and still require qualified specialist review.

### Slice 5 — Durable criterion evidence

**Status:** Validated

An authenticated workspace owner can record a durable evidence result against an existing acceptance criterion. Each evidence record captures result, source/provenance, effect (`Supports`, `Challenges`, or `Inconclusive`), stable identifier, recorder, release/stage, and the linked requirement and criterion revisions.

The slice passed the existing durable regression suite and a focused evidence-specific acceptance suite at application commit `4f67d99078600735f086ae894017481234a5a109` through CI run 151. See the [evidence slice](INCREMENT_2_EVIDENCE.md) and [validation record](validation/increment-2-evidence.md).

Validated scope includes transactional evidence creation, requirement-to-criterion-to-evidence traceability, revision snapshots, idempotent retries, criterion/workspace integrity, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, keyboard focus, and mobile/desktop rendered review.

Recording evidence does not mark the acceptance criterion satisfied, passed, verified, or validated and does not change the linked requirement from `Approved`.

### Slice 6 — Durable proposed artifacts

**Status:** Validated

An authenticated workspace owner can record a durable artifact identity with one stable initial version and an external reference. Version 1 is constrained to lifecycle `Proposed`; creation by itself does not make the artifact accepted project direction.

The slice passed all existing durable regression suites and a focused artifact-specific acceptance suite at application commit `8d36adede6c4b5c5570b7a3e37a519588124500b` through CI run 157. See the [artifact slice](INCREMENT_2_ARTIFACTS.md) and [validation record](validation/increment-2-artifacts.md).

Validated scope includes transactional artifact-plus-version creation, stable artifact/version identifiers, derived owner/release/stage context, idempotent retries, HTTP/HTTPS reference validation, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, keyboard focus, mobile/desktop rendered review, and explicit proof that Wayfound stores the external reference without fetching it.

### Slice 7 — Owner artifact acceptance

**Status:** Validated

An authenticated current workspace owner can explicitly accept one existing proposed artifact version as the version currently accepted as project direction. The action requires product-owner authority confirmation, changes that exact version from `Proposed` to `Accepted`, stores the artifact accepted-version pointer, accepting actor and acceptance time, increments artifact/version revisions, and records `artifact.accepted` in the audit log.

The slice passed the full prior durable regression chain plus a focused acceptance suite at repository head `3ca0ea4a1fe931e80a9466250915efe623827847` through CI run 164. See the [artifact-acceptance slice](INCREMENT_2_ARTIFACT_ACCEPTANCE.md) and [validation record](validation/increment-2-artifact-acceptance.md).

Validated scope includes exact artifact/version target integrity, explicit owner authority, idempotent retry, invalid-state rejection, direct-table denial, tenant/session/revocation isolation, injected-failure rollback, restart/resume, database interruption/recovery, zero external-reference fetches, keyboard focus, and mobile/desktop rendered review.

Artifact acceptance records product-owner project direction only. It does not establish qualified specialist review, technical correctness, verification, validation, release readiness, or production authorization.

### Remaining Increment 2 scope

Specialist-review decision and technical-requirement flow; work-state transitions, collaborator/specialist assignment, work dependencies and broader durable links; multiple acceptance-criterion lifecycle; evidence freshness/outdated-state handling, evidence acceptance or specialist review, and explicit verification decisions; maintenance records; later lifecycle behavior; change-impact handling; and supporting audit/seed behavior remain In progress or unimplemented. No hosted project has been provisioned.

Later artifact-version, accepted-version replacement/supersession, and file-import behavior are assigned to Increment 3 rather than duplicated in the remaining Increment 2 scope.

## 4. Increment 3 — Versioned artifact import

**Status:** Proposed

**Outcome:** An owner can import revised specifications without losing or silently replacing the accepted version.

**Expected scope:** proposed artifact versions beyond the initial durable record, preservation of the currently accepted version while a later version is proposed, explicit later-version acceptance/replacement behavior, file/import boundaries, failed-import records, retry history, and a plain-English change summary or documented alternative comparison before accepting an imported revision.

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
