# Wayfound Delivery Plan

**Status:** Draft

## Purpose

This file is the current execution plan for Wayfound. It translates approved scope and requirements into sequenced work.

Do not use this file to redefine product scope or architecture. Update the authoritative source first.

## 1. Current objective

Deliver and validate the first Wayfound Interview vertical slice.

The slice must let a user describe an idea in plain language, make a small set of guided decisions, understand recommendations and tradeoffs, see project state, and finish with a usable summary and next action.

Included requirements: WF-001 through WF-007.

Excluded from this objective: accounts, persistence, external AI, code generation, integrations, and production deployment.

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

**Status:** In progress — implementation and automated model validation complete; manual browser validation remains.

### M1 — Production architecture baseline

**Goal:** Select the minimum production architecture required after the Interview experience is validated.

**Entry criteria:** M0.5 user experience validated and next production outcome approved.

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
| Define current Wayfound product statement and broad users | Project charter | Project owner | Implemented | Current project-owner instruction | Charter review |
| Define guided Interview requirements | WF-001 through WF-007 | Project owner | Implemented | Product definition | Requirements review |
| Implement dependency-free Interview page | WF-001 through WF-007 | Implementation | Implemented | Requirements | Automated state tests + manual browser review |
| Validate Interview state model | WF-002, WF-004, WF-005, WF-007 | Implementation | Validated | Interview model | `node --test tests/*.test.mjs` |
| Validate Interview visual and interaction behavior | WF-001 through WF-007 | Project owner / reviewer | In progress | Implemented page | Manual browser review |
| Define adaptive question-selection behavior | Future requirement | Project owner | Proposed | Starter Interview validation | Requirement and UX review |
| Select production architecture | Architecture / future ADRs | Project owner | Blocked | Validated Interview and next production outcome | Architecture review |

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

Potential next work after the starter Interview is validated:

- adaptive question selection based on the idea and prior decisions
- structured decision records that feed Requirements, Journey, Work, and Records
- persistence with defined privacy and data authority
- external AI assistance with explicit trust and data-processing boundaries
- browser-level automated interaction and accessibility validation

These items are not committed scope until their requirements are approved.

## 8. Change rule

Update this plan when approved scope, requirement priority, dependency order, or delivery status changes. Do not use the plan as a substitute for requirements or architecture records.
