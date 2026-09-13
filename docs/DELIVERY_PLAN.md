# Wayfound Delivery Plan

**Status:** Draft

## Purpose

This file is the current execution plan for Wayfound. It translates approved scope and requirements into sequenced work.

Do not use this file to redefine product scope or architecture. Update the authoritative source first.

## 1. Current objective

**TBD — define the first bounded delivery outcome.**

A good objective identifies:

- user or system outcome
- included requirements
- excluded work
- validation method
- completion condition

## 2. Delivery rules

- Prefer small vertical slices that produce testable behavior.
- Sequence work by dependency and risk, not by convenience alone.
- Resolve high-impact unknowns before building large dependent areas.
- Keep speculative future work out of the active milestone.
- Do not mark work complete until required validation passes.
- Record blockers with a named dependency or decision.

## 3. Milestones

### M0 — Product definition

**Goal:** Establish enough approved product context to select an architecture and define the first build slice.

**Exit criteria:**

- Product statement approved.
- Primary users and core problem approved.
- In-scope and out-of-scope boundaries approved.
- Initial delivery target approved.
- Initial functional requirements approved.
- Key non-functional constraints identified or explicitly deferred.

**Status:** In progress

### M1 — Architecture baseline

**Goal:** Select the minimum architecture required for the first delivery target.

**Entry criteria:** M0 exit criteria met.

**Exit criteria:**

- System context defined.
- Major component boundaries defined.
- Data authority defined.
- Security boundaries defined.
- Deployment and rollback approach defined.
- Foundational decisions recorded as ADRs.
- Validation approach defined.

**Status:** Proposed

### M2 — First working vertical slice

**Goal:** Deliver one end-to-end user or system outcome with production-quality engineering practices appropriate to the target environment.

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
| Define Wayfound product statement | Project charter | Project owner | Proposed | None | Charter review |
| Define primary users and core problem | Project charter | Project owner | Proposed | None | Charter review |
| Define first delivery outcome | Project charter / requirements | Project owner | Proposed | Product statement | Scope review |
| Create initial approved requirements | Product requirements | TBD | Blocked | Product definition | Acceptance criteria review |
| Select architecture baseline | Architecture / ADRs | TBD | Blocked | Approved initial requirements | Architecture review |

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

**TBD**

Record future ideas here only after they are sufficiently clear to preserve. Future work is not committed scope.

## 8. Change rule

Update this plan when approved scope, requirement priority, dependency order, or delivery status changes. Do not use the plan as a substitute for requirements or architecture records.