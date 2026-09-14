# Wayfound Delivery Plan

**Status:** In progress

## 1. Delivery objective

Deliver Wayfound as validated vertical slices. Each slice must improve a complete user outcome and leave the repository coherent.

The active first-version product model is defined by ADR-0005: one authenticated human product owner works with AI assistance. Multi-human collaboration is deferred. Existing specialist-review slices remain valid historical implementation evidence but are not required in the active single-user product surface.

## 2. Increment 1 — Foundation and orientation

**Status:** Validated

**Outcome:** A user can open the Borrow Desk prototype, understand the current release and stage, see one recommended next action with its reason, and move across the primary workspace areas.

**Evidence:** [Increment 1 validation record](validation/increment-1.md), application commit `4cbc8fddc092dc27ee3b59fddb039e42e7e3a1cf`, CI run 62. No independent user research or Released state is claimed.

## 3. Increment 2 — Durable single-owner workspace record

**Status:** In progress

**Outcome:** One authenticated owner can create and resume a workspace without relying on chat history and can progressively build durable project records inside it.

### Validated slices

1. **Create, list, open, and resume** — Validated at `603f02862ae4090bd1853157e449a01508186f4c`, CI run 70. See [slice](INCREMENT_2_SLICE.md) and [validation](validation/increment-2-durable-workspace.md).
2. **Owner-authorized durable decisions** — Validated at `548f1bbb4264ca412bc808a94a60593bca2c3602`, CI run 92. See [slice](INCREMENT_2_DECISIONS.md) and [validation](validation/increment-2-decisions.md).
3. **Owner-owned proposed work items** — Validated at `1f2a1c99856119c845a4495b61674bea415a4a77`, CI run 113. See [slice](INCREMENT_2_WORK_ITEMS.md) and [validation](validation/increment-2-work-items.md).
4. **Owner-approved product requirements** — Validated at `9e2af6940ce4d440fed00825620e0b693eff17c2`, CI run 131. See [slice](INCREMENT_2_REQUIREMENTS.md) and [validation](validation/increment-2-requirements.md).
5. **Durable criterion evidence** — Validated at `4f67d99078600735f086ae894017481234a5a109`, CI run 151. See [slice](INCREMENT_2_EVIDENCE.md) and [validation](validation/increment-2-evidence.md).
6. **Durable proposed artifacts** — Validated at `8d36adede6c4b5c5570b7a3e37a519588124500b`, CI run 157. See [slice](INCREMENT_2_ARTIFACTS.md) and [validation](validation/increment-2-artifacts.md).
7. **Owner artifact acceptance** — Validated at `3ca0ea4a1fe931e80a9466250915efe623827847`, CI run 164. See [slice](INCREMENT_2_ARTIFACT_ACCEPTANCE.md) and [validation](validation/increment-2-artifact-acceptance.md).
8. **Assignment-scoped specialist artifact review** — Validated at `fc91a4377e887cada269fb35b2192f5c3efad15b`, CI run 172. See [ADR-0003](adr/0003-assignment-scoped-specialist-review.md), [slice](INCREMENT_2_SPECIALIST_REVIEW.md), and [validation](validation/increment-2-specialist-review.md). This capability is retained as historical validated implementation but is outside the active single-user first-version surface under ADR-0005.
9. **Owner work approval, start, block, and resume** — Validated at `1c3d8a52a820163340b8742f3f8f3a24f7115545`, CI run 179. See [slice](INCREMENT_2_WORK_LIFECYCLE.md) and [validation](validation/increment-2-work-lifecycle.md).
10. **Consequential technical decision review and acceptance** — Validated at `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b`, CI run 201. See [ADR-0004](adr/0004-technical-decision-review-and-acceptance.md), [slice](INCREMENT_2_TECHNICAL_DECISIONS.md), and [validation](validation/increment-2-technical-decisions.md). The authenticated human-review mechanism is retained but hidden from active single-user test mode under ADR-0005.
11. **Consequential technical requirement review and approval** — Validated at application head `ec9612e2e87c05780558471a9ab9d76246be417b`, CI run 220, with documentation reconciled at `272abdf56da913b23de47721919f329fa68863da`, CI run 221. See [slice](INCREMENT_2_TECHNICAL_REQUIREMENTS.md) and [validation](validation/increment-2-technical-requirements.md). The authenticated human-review mechanism is retained but hidden from active single-user test mode under ADR-0005.
12. **Owner-recorded work implementation completion** — Validated at application head `b28e1718174d84e66c7e97fe203de12034d3b2ba`, CI run 308. See [slice](INCREMENT_2_WORK_COMPLETION.md) and [validation](validation/increment-2-work-completion.md). `Implemented` records owner-reported completion of bounded work and does not establish verification, validation, stage completion, release readiness, or release.
13. **Durable advisory AI review of exact implemented work** — Validated at application head `dc819b65d42a1bc57e4eb7115ce5ed53bafcbca4`, CI run 329. See [slice](INCREMENT_2_AI_REVIEW.md) and [validation](validation/increment-2-ai-review.md). The review snapshots one exact `Implemented` work revision, uses only supported loopback local AI, records provider/model provenance and advisory result or failure, and requires explicit owner disposition without altering verification or project authority.
14. **Durable work-item dependencies** — Validated at application/test head `a3484c37199e0072b05eaf5f9979eff6406774b0`, CI run 346. See [slice](INCREMENT_2_WORK_DEPENDENCIES.md) and [validation](validation/increment-2-work-dependencies.md). The owner can create and remove acyclic same-workspace work dependencies with durable history and revision snapshots; dependency state does not automatically change work status or establish readiness, verification, or impact propagation.
15. **Durable work-to-project-direction links** — Validated at application/test head `ccf138887980c9bc7c53a3a9817c9c75572278c3`, CI run 367. See [slice](INCREMENT_2_WORK_DIRECTION_LINKS.md) and [validation](validation/increment-2-work-direction-links.md). The owner can record that work relies on an accepted owner decision or exact current accepted artifact version with authoritative revision snapshots and reversible history. The link records reliance only and does not establish that impact exists, is known, or is resolved.
16. **Additional product acceptance criteria** — Validated at application/test head `21d2afdec3a7880656c84e77b2753e2d9d80d871`, CI run 375. See [slice](INCREMENT_2_MULTIPLE_CRITERIA.md) and [validation](validation/increment-2-multiple-criteria.md). The owner can add later conditions to an existing approved product requirement while preserving exact criterion/evidence identity and revision snapshots. The owner-only path cannot add conditions to technical requirements, and criterion creation does not establish evidence freshness, verification, or completion.

### Active remaining Increment 2 scope

The active single-user scope now prioritizes:

1. remaining acceptance-criterion lifecycle beyond validated additive product criteria, including criterion change/withdrawal behavior and any future technical multi-criterion design;
2. evidence freshness/outdated-state handling and explicit verification decisions;
3. maintenance records and later lifecycle behavior;
4. change-impact handling, including dependency/project-direction impact behavior;
5. supporting audit, recovery, and seed behavior.

The validated durable-link baseline now includes work-to-work dependencies plus work-to-accepted-owner-decision and work-to-exact-current-accepted-artifact-version relationships. Generic arbitrary-record links, requirement/evidence-to-work links, change detection, and impact-resolution lifecycle remain future scope unless a later bounded slice approves them.

Accepted technical-decision replacement/supersession, approved technical-requirement replacement/withdrawal/supersession/deprecation, and dependency/project-direction impact behavior remain future scope. Later artifact-version, accepted-version replacement/supersession, and file-import behavior are assigned to Increment 3.

### Removed from active Increment 2 scope by ADR-0005

The following items are no longer required for the active first version:

- collaborator membership/administration;
- ownership transfer;
- human work assignment;
- reviewer-code exchange as a normal user workflow;
- additional authenticated human-specialist surfaces.

The existing validated specialist implementation is preserved in the repository. It is not deleted or relabeled as AI review.

## 4. Increment 3 — Versioned artifact import

**Status:** Proposed

**Outcome:** The owner can import revised specifications without losing or silently replacing the accepted version.

**Expected scope:** proposed artifact versions beyond the initial durable record, preservation of the currently accepted version while a later version is proposed, explicit later-version acceptance/replacement behavior, file/import boundaries, failed-import records, retry history, and a plain-English change summary or documented alternative comparison before accepting an imported revision.

## 5. Increment 4 — AI-assisted review and reconciliation

**Status:** Proposed

**Outcome:** The owner can extend bounded AI analysis beyond the validated exact-work-item path, understand findings and provenance, and explicitly reconcile broader AI input without confusing AI output with verification.

**Expected scope:** broader AI-review targets beyond the exact `Implemented` work-item slice, stale-review handling after material target change, richer reconciliation or comparison behavior where approved, and continued clear separation from objective verification evidence. The first durable exact-work-item AI-review path, provider/model provenance, bounded result history, and owner disposition are already Validated in Increment 2.

Optional external human-review packaging remains deferred unless the product owner later approves it.

## 6. Increment 5 — Impact, readiness, release, and care

**Status:** Proposed

**Outcome:** Changes expose affected evidence, and the owner can review a concrete release packet, record the release decision, and retain operating responsibility.

**Expected scope:** change detection and impact records built on the validated work-to-work and work-to-project-direction traceability primitives, outdated-evidence handling, requirement-to-criterion-to-evidence traceability, readiness view, release packet and scoped authorization, deployment outcome record, and maintenance due items.

## 7. Deferred roadmap

Do not include these items without an approved scope change:

- collaborator accounts or invitations;
- human work assignment inside Wayfound;
- specialist reviewer accounts or reviewer-code workflows as active product features;
- mandatory human handoff/return workflows;
- verified direct specialist connectors;
- automatic CI/CD evidence ingestion;
- automatic repository change analysis;
- scheduling integrations;
- portfolio reporting;
- automatic production actions.

## 8. Completion rule

An increment is not `Validated` until its acceptance criteria and required checks have executed against an identified build. A validated bounded slice does not make its parent increment Validated when material approved scope remains unfinished. A preview deployment alone does not establish validation.
