# Wayfound Delivery Plan

**Status:** Draft

## Purpose

This file is the current execution plan for Wayfound. It translates approved scope and requirements into sequenced work.

Do not use this file to redefine product scope or architecture. Update the authoritative source first.

## 1. Current objective

Prepare the first production-capable vertical slice using the accepted M1 production architecture.

The next slice must prove that the selected stack can preserve Wayfound's validated governance model when project state becomes durable: authenticated Actor identity, server-side authoritative commands, relational revision/traceability persistence, explicit Draft → Proposed → future Approved separation, and safe deployment/migration boundaries.

Accepted M1 stack: Next.js + TypeScript on Vercel, Neon PostgreSQL, Clerk authentication, and Wayfound-owned project authorization/domain rules.

Excluded from the next implementation until separately approved: external AI/model processing of user content, public project sharing, broad hosted access for younger users before age/consent requirements are defined, code-generation agents, and production integrations unrelated to the first vertical slice.

## 2. Delivery rules

- Prefer small vertical slices that produce testable behavior.
- Sequence work by dependency and risk, not by convenience alone.
- Resolve high-impact unknowns before building large dependent areas.
- Keep speculative future work out of the active milestone.
- Do not mark work complete until required validation passes.
- Record blockers with a named dependency or decision.
- Do not bypass the accepted server-side authority boundary for convenience.
- Do not treat deployment success as release approval.

## 3. Milestones

### M0 — Product definition

**Goal:** Establish enough approved product context to support the first Interview slice without inventing production boundaries.

**Exit criteria:**

- Product statement defined for current scope.
- Primary users and core problem defined for current scope.
- Initial in-scope and out-of-scope boundaries defined.
- Initial delivery target defined.
- WF-001 through WF-007 approved.
- Production-only unknowns remain explicit rather than assumed.

**Status:** Implemented; charter remains Draft pending broader product review.

### M0.5 — Guided Interview vertical slice

**Goal:** Deliver the first interactive Wayfound behavior while keeping the production architecture reversible.

**Entry criteria:** WF-001 through WF-007 approved.

**Exit criteria:**

- User can enter a free-form idea.
- User can complete the starter guided decision flow.
- Recommendations, rationale, and tradeoffs are visible.
- Project state shows decisions, assumptions, blockers, and open questions.
- Completion produces a summary and next action.
- Automated Interview model tests pass.
- Manual browser review confirms layout, keyboard interaction, responsive behavior, and Wayfound visual consistency.

**Status:** Validated — implementation, automated model validation, and browser interaction review are complete.

### M0.6 — Adaptive Interview

**Goal:** Make the Interview choose its next useful question from the current idea and prior decisions while keeping the routing mechanism local, transparent, and reversible.

**Entry criteria:** M0.5 guided Interview slice validated.

**Exit criteria:**

- Different representative idea types produce different applicable question sets.
- The same state produces the same next question.
- Accepted answers can make later material questions appear or disappear.
- Progress and completion use only currently applicable required questions.
- `I am not sure yet` remains a visible open question without becoming a blocker by default.
- Back/review preserves applicable choices.
- Automated adaptive model tests pass.
- Browser review confirms adaptive paths, keyboard behavior, summary traceability, and responsive layout.

**Status:** Validated

### M0.7 — Traceable Interview records

**Goal:** Turn current Interview state into explicit records that Wayfound can show and later reference without creating a second authority.

**Entry criteria:** M0.6 adaptive Interview validated.

**Exit criteria:**

- Accepted applicable answers produce deterministic decision records.
- `Not sure` answers produce open-question records instead of accepted decisions.
- Derived assumptions and blockers produce distinct records.
- Records excludes stale answers that are no longer applicable.
- Records page shows an empty state and current session records.
- Switching between Interview and Records preserves the active in-memory state.
- Records is usable on desktop and mobile layouts.
- Automated record-model tests and browser review pass.

**Status:** Validated

### M0.8 — Draft build artifacts

**Goal:** Show how traceable Records can become useful build artifacts without confusing generated suggestions with approved state.

**Entry criteria:** M0.7 traceable Interview records validated.

**Exit criteria:**

- Current Records can produce a draft build brief.
- Accepted decisions produce traceable draft Journey steps.
- Only mapped behavior decisions produce draft requirement candidates.
- Assumptions, blockers, and open questions produce draft follow-up work.
- `Not sure` and unresolved state do not become requirements.
- Every generated artifact retains source Record IDs.
- Records displays an unmistakable `Draft only` boundary.
- Desktop and mobile browser review passes.
- Artifact projection tests pass.

**Status:** Validated

### M0.9 — Review actionable draft artifacts

**Goal:** Let users explicitly carry actionable drafts forward for project-owner review, or set them aside, without confusing that review state with approval.

**Entry criteria:** M0.8 draft build artifacts validated.

**Exit criteria:**

- Draft requirements and draft follow-up work can remain Draft, be marked Proposed, or be Set aside.
- Build brief and Journey preview remain descriptive and are not promotion targets in this slice.
- Proposed is visibly explained as pending project-owner review and never as approval.
- The review model rejects an Approved disposition.
- Undo returns Proposed or Set aside items to Draft.
- Review state for an artifact is discarded if the artifact disappears or its content/source signature changes.
- Review-state model tests pass.
- Browser interaction and responsive validation pass before the milestone is marked Validated.

**Status:** Validated — 7 review-state model tests and the Chromium interaction/responsive browser gate pass.

### M1 — Production architecture baseline

**Goal:** Select the minimum production architecture required after the Interview experience is validated.

**Entry criteria:** M0.9 artifact review validated and next production outcome approved.

**Exit criteria:**

- System context defined.
- Major component boundaries defined.
- Data authority defined.
- Security and privacy boundaries defined.
- Deployment and rollback approach defined.
- Foundational decisions recorded as ADRs.
- Concrete production stack selected.
- Validation approach defined.

**Status:** Accepted — ADR-0007 records project-owner approval of the M1 package and concrete stack. ADR-0001 through ADR-0006 preserve the detailed proposal/rationale that ADR-0007 accepted.

### M2 — First production-capable vertical slice

**Goal:** Deliver one end-to-end Wayfound outcome using the accepted production architecture.

**Entry criteria:** M1 production architecture accepted and the M2 product requirements approved.

**Initial target outcome:**

Prove one durable project path that preserves the validated prototype's human-control model:

1. user authenticates through Clerk and maps to a stable Wayfound Actor
2. user creates/opens a project through Wayfound server-side commands
3. accepted Interview/project state is persisted in Neon PostgreSQL using immutable revisions and trace links
4. a generated candidate remains non-authoritative until explicitly proposed
5. Propose persists an exact Artifact Revision and exact source-revision links
6. a distinct authorized human action can later approve an exact revision once the approval requirement is defined
7. stale/concurrent writes are rejected instead of silently overwriting project state
8. preview/development environments cannot write production project data
9. migration/rollback and backup/restore evidence exist before release

**Exit criteria:**

- Selected production requirements implemented.
- Acceptance criteria pass.
- Required automated checks pass.
- Important failure behavior is verified.
- Required observability is present without unrestricted project-content logging.
- Documentation matches implementation.
- Release decision is explicit.

**Status:** In progress — WF-017 through WF-022 are approved and implementation is active in PR #9. Automated build, PostgreSQL, backup/restore, and migration rollback gates run in CI; live Clerk/preview browser validation remains pending.

## 4. Active work

| Work item | Source | Owner | Status | Dependency | Validation |
| --- | --- | --- | --- | --- | --- |
| Preserve validated guided Interview baseline | WF-001 through WF-007 | Implementation | Validated | M0.5 | Existing model + browser evidence |
| Define adaptive Interview behavior | WF-008 through WF-011 | Project owner | Validated | Guided Interview baseline | Requirements review |
| Implement local idea classifier and question registry | WF-008 | Implementation | Validated | Adaptive requirements | Model + browser tests |
| Implement answer-driven question applicability | WF-009 | Implementation | Validated | Question registry | Applicability tests |
| Implement dynamic progress and completion | WF-010 | Implementation | Validated | Applicability model | Completion tests + browser flow |
| Preserve adaptive back/review history | WF-011 | Implementation | Validated | Adaptive navigation | History + browser tests |
| Implement structured Interview record projection | WF-012 | Implementation | Validated | Adaptive Interview state | Record-model tests |
| Implement Records view for current session | WF-013 | Implementation | Validated | Record projection | Desktop + mobile browser review |
| Derive draft build artifacts from Records | WF-014 | Implementation | Validated | Traceable Records | Artifact-model tests + browser review |
| Show draft build artifacts in Records | WF-015 | Implementation | Validated | Draft artifact projection | Desktop + mobile browser review |
| Review actionable draft artifacts | WF-016 | Implementation | Validated | Validated Draft artifacts | 7 model tests + Chromium interaction/responsive gate |
| Accept production architecture boundaries | ADR-0001 through ADR-0006 via ADR-0007 | Project owner | Accepted | M0.9 | Architecture review |
| Select production stack | ADR-0007 | Project owner | Accepted | M1 boundary decisions | Stack comparison + project-owner approval |
| Define M2 production requirements | WF-017 through WF-022 | Project owner | Approved | Accepted M1 | Requirements review |
| Scaffold production Next.js/TypeScript application | ADR-0007 / WF-017 through WF-022 | Implementation | In progress | Approved M2 requirements | CI build/type/test gate |
| Define initial Neon relational schema/migrations | ADR-0002 / ADR-0007 / WF-018 through WF-020 | Implementation | In progress | Approved M2 requirements | PostgreSQL integration + rollback/restore gates |
| Integrate Clerk identity → Wayfound Actor mapping | ADR-0003 / ADR-0007 / WF-017 | Implementation | In progress | Approved M2 requirements | Stable-Actor integration + non-production Clerk validation |

## 5. Work item standard

A work item is ready for implementation when it has:

- a clear outcome
- authoritative source reference
- defined scope
- acceptance criteria
- known dependencies
- material assumptions identified
- required design decision resolved or explicitly bounded

A work item is complete when:

- implementation is complete
- applicable tests pass
- acceptance criteria pass
- relevant failure modes are reviewed
- documentation is reconciled
- remaining risk is recorded

## 6. Blocker standard

A blocker entry must state:

1. what cannot proceed
2. the exact dependency or decision
3. the owner of that dependency or decision
4. the next action

Do not use `blocked` for ordinary uncertainty that can be handled by a reversible assumption.

## 7. Future work

Near-term work after M2 requirements are approved:

- production Next.js / TypeScript scaffold
- application/domain module boundaries
- Neon PostgreSQL schema, migrations, revision and traceability invariants
- Clerk authentication and internal Actor mapping
- project authorization/capabilities
- production browser/integration tests
- environment separation, preview-data isolation, migration and rollback evidence

Later work, not committed to M2 by default:

- richer semantic question routing if the deterministic classifier proves too limited
- external AI assistance with explicit trust and data-processing boundaries
- public/shared projects after privacy and authorization requirements are approved
- code-generation/development-agent execution
- additional integrations

## 8. Change rule

Update this plan when approved scope, requirement priority, dependency order, or delivery status changes. Do not use the plan as a substitute for requirements or architecture records.
