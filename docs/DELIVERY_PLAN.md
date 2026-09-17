# Wayfound Delivery Plan

**Status:** Draft

## Purpose

This file is the current execution plan for Wayfound. It translates approved scope and requirements into sequenced work.

Do not use this file to redefine product scope or architecture. Update the authoritative source first.

## 1. Current objective

Deliver and validate traceable Interview records without introducing persistence or a second data authority.

The records slice must project accepted Interview choices and derived uncertainty into structured records, show those records in Wayfound Records, and preserve the current session when the user moves between Interview and Records.

Included requirements: WF-012 through WF-013, while preserving WF-001 through WF-011.

Excluded from this objective: persistence, accounts, external AI or model calls, code generation, production integrations, and production deployment.

## 2. Delivery rules

- Prefer small vertical slices that produce testable behavior.
- Sequence work by dependency and risk, not by convenience alone.
- Resolve high-impact unknowns before building large dependent areas.
- Keep speculative future work out of the active milestone.
- Do not mark work complete until required validation passes.
- Record blockers with a named dependency or decision.

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

### M1 — Production architecture baseline

**Goal:** Select the minimum production architecture required after the Interview experience is validated.

**Entry criteria:** M0.7 traceable Interview records validated and next production outcome approved.

**Exit criteria:**

- System context defined.
- Major component boundaries defined.
- Data authority defined.
- Security and privacy boundaries defined.
- Deployment and rollback approach defined.
- Foundational decisions recorded as ADRs.
- Validation approach defined.

**Status:** Proposed

### M2 — First production-capable vertical slice

**Goal:** Deliver one end-to-end Wayfound outcome using the approved production architecture.

**Entry criteria:** Required M1 decisions approved.

**Exit criteria:**

- Selected requirements implemented.
- Acceptance criteria pass.
- Required automated checks pass.
- Important failure behavior is verified.
- Required observability is present.
- Documentation matches implementation.
- Release decision is explicit.

**Status:** Proposed

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
| Select production architecture | Architecture / future ADRs | Project owner | Blocked | Validated adaptive Interview and next production outcome | Architecture review |

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

Next candidate work after the validated Interview Records slice:

- richer semantic question routing if the deterministic classifier proves too limited
- promote selected records into draft Requirements, Journey, and Work artifacts
- persistence with defined privacy and data authority
- external AI assistance with explicit trust and data-processing boundaries
- browser-level automated interaction and accessibility validation

These items are not committed scope until their requirements are approved.

## 8. Change rule

Update this plan when approved scope, requirement priority, dependency order, or delivery status changes. Do not use the plan as a substitute for requirements or architecture records.
