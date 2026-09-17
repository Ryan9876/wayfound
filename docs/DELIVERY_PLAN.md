# Wayfound Delivery Plan

**Status:** Draft

## Purpose

This file is the current execution plan for Wayfound. It translates approved scope and requirements into sequenced work.

Do not use this file to redefine product scope or architecture. Update the authoritative source first.

## 1. Current objective

Complete the first **local-first durable Wayfound vertical slice** using ADR-0009.

M2 must prove that Wayfound can preserve its validated governance model while running privately on one computer: stable local Actor identity, local server-side authoritative commands, local relational revision/traceability persistence, explicit Draft → Proposed → future Approved separation, stale-write protection, and provider-optional AI.

Current runtime target: Next.js + TypeScript running locally, SQLite for default durable project state, a stable local human Actor with no sign-in requirement, AI off by default, Ollama/LM Studio as first-class local AI options, and explicitly opt-in external AI adapters.

Vercel, PostgreSQL/Neon, and Clerk remain optional hosted-mode adapters and are not M2 merge gates.

Excluded from M2 until separately approved: formal Artifact approval, public project sharing, hosted collaboration, automatic cloud synchronization, broad hosted access for younger users before age/consent requirements are defined, autonomous destructive tool actions, and production integrations unrelated to the local vertical slice.

## 2. Delivery rules

- Prefer small vertical slices that produce testable behavior.
- Sequence work by dependency and risk, not by convenience alone.
- Resolve high-impact unknowns before building large dependent areas.
- Keep speculative future work out of the active milestone.
- Do not mark work complete until required validation passes.
- Record blockers with a named dependency or decision.
- Do not bypass the accepted server-side authority boundary for convenience.
- Local mode must not silently require a hosted provider.
- Project content must not leave the computer unless an approved feature and explicit user/provider choice allows it.
- Do not treat a build, hosted deployment, or model response as release/approval authority.

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

**Status:** Validated.

### M0.6 — Adaptive Interview

**Goal:** Make the Interview choose its next useful question from the current idea and prior decisions while keeping routing local, transparent, and reversible.

**Entry criteria:** M0.5 validated.

**Exit criteria:**

- Representative idea types produce different applicable question sets.
- The same state produces the same next question.
- Accepted answers can make material later questions appear/disappear.
- Progress/completion use only applicable required questions.
- `I am not sure yet` remains an open question without becoming a blocker by default.
- Back/review preserves applicable choices.
- Automated model and browser validation pass.

**Status:** Validated.

### M0.7 — Traceable Interview records

**Goal:** Turn current Interview state into explicit records that Wayfound can show and later reference without creating a second authority.

**Entry criteria:** M0.6 validated.

**Exit criteria:** deterministic typed records, stale/non-applicable answer exclusion, responsive Records view, automated record tests, and browser review.

**Status:** Validated.

### M0.8 — Draft build artifacts

**Goal:** Show how traceable Records can become useful build artifacts without confusing generated suggestions with approved state.

**Entry criteria:** M0.7 validated.

**Exit criteria:** draft brief/Journey/requirements/work are traceable, unresolved state does not become requirements, Draft boundary is explicit, and model/browser validation passes.

**Status:** Validated.

### M0.9 — Review actionable draft artifacts

**Goal:** Let users explicitly carry actionable drafts forward for project-owner review, or set them aside, without confusing that review state with approval.

**Entry criteria:** M0.8 validated.

**Exit criteria:** Draft/Proposed/Set aside/Undo semantics, stale-content reset, explicit non-approval language, and model/browser validation pass.

**Status:** Validated.

### M1 — Durable architecture baseline

**Goal:** Establish the durable domain, authority, persistence, identity, AI/tool, and deployment boundaries needed after the Interview experience is validated.

**Entry criteria:** M0.9 validated.

**Exit criteria:**

- System context defined.
- Major component boundaries defined.
- Data authority defined.
- Security/privacy boundaries defined.
- Deployment/rollback approach defined.
- Foundational ADRs recorded.
- Default runtime selected.
- Validation approach defined.

**Status:** Accepted, with architecture corrected by ADR-0009. ADR-0001 through ADR-0006 preserve the durable authority model. ADR-0007 records the prior hosted-first interpretation; ADR-0009 is the current runtime authority and makes local operation the default.

### M2 — Local durable project vertical slice

**Goal:** Deliver one end-to-end Wayfound outcome locally without requiring a cloud account or external model.

**Entry criteria:** ADR-0009 accepted and local-first M2 product requirements approved.

**Initial target outcome:**

1. Wayfound starts locally with no Clerk/Neon/Vercel requirement.
2. The installation creates/reuses one stable local human Actor.
3. The user creates/opens a project through local Wayfound server-side commands.
4. Project state is persisted in local SQLite using immutable revisions and exact trace links.
5. A generated candidate remains non-authoritative until explicitly proposed.
6. Propose persists an exact Artifact Revision and exact source-revision links.
7. stale/concurrent writes are rejected rather than silently overwriting current state.
8. the M2 database cannot store `approved` as an Artifact lifecycle state.
9. AI is off by default.
10. Ollama and LM Studio can be selected as local model endpoints without an external-content opt-in.
11. a non-loopback OpenAI-compatible endpoint is blocked until outbound AI is deliberately enabled.
12. the production build and local runtime work without hosted-service credentials.

**Exit criteria:**

- Local-first M2 requirements implemented.
- Local SQLite integration tests pass.
- Existing domain/concurrency/traceability checks pass.
- AI provider-boundary tests pass.
- TypeScript and Next.js production build pass.
- Project survives local database/process reopen.
- Important failure behavior is verified.
- Documentation matches implementation.
- Hosted adapters, if retained, do not become required dependencies for local operation.
- Release decision is explicit.

**Status:** Validated — M2 local-first CI run #66 passes the complete local gate: domain/AI tests, SQLite integration and reopen behavior, TypeScript, production build without hosted credentials, Chromium create/reopen/save/propose/stale-conflict flow, 390 px responsive check, and optional PostgreSQL compatibility.

### M2.1 — Durable Adaptive Interview

**Goal:** Move the validated adaptive Interview behavior onto the validated local M2 authority/persistence path without changing the question policy.

**Entry criteria:** M2 validated; WF-023 and WF-024 approved.

**Exit criteria:**

- The durable project UI uses the validated adaptive question model and recommendations.
- Accepted choices persist through local authoritative commands as immutable Answer Revisions.
- Refresh/reopen reconstructs current answers from SQLite and resumes the correct adaptive question.
- Review/back preserves persisted selections and revisions can be changed without overwriting history.
- `not sure` remains unresolved and does not become an accepted decision Record.
- Stale writes remain rejected.
- Model-parity, integration, TypeScript/build, and Chromium adaptive/reopen gates pass.
- No cloud account or LLM is required.

**Status:** Validated — model parity, SQLite revision/reopen behavior, server-side applicability validation, no-cloud build, adaptive Chromium flow, answer revision, stale-conflict, and 390 px responsive gates pass.

## 4. Active work

| Work item | Source | Owner | Status | Dependency | Validation |
| --- | --- | --- | --- | --- | --- |
| Preserve validated guided/adaptive Interview baseline | WF-001 through WF-011 | Implementation | Validated | M0.5/M0.6 | Existing model + browser evidence |
| Preserve traceable Records and Draft artifact/review behavior | WF-012 through WF-016 | Implementation | Validated | M0.7-M0.9 | Existing model + browser evidence |
| Preserve durable domain/command/revision boundaries | ADR-0001 through ADR-0006 | Implementation | Accepted | M1 | Architecture + domain tests |
| Correct runtime to local-first | ADR-0009 | Project owner | Accepted | Project-owner decision | ADR + architecture reconciliation |
| Implement stable local human Actor | WF-017 / ADR-0009 | Implementation | Validated | Local SQLite | Local integration + reopen tests |
| Implement local SQLite project store | WF-018 through WF-021 / ADR-0009 | Implementation | Validated | SQLite schema | Local integration + Chromium reopen flow |
| Preserve exact revisions, trace links, idempotency, and stale-write checks locally | WF-019 through WF-021 | Implementation | Validated | Local project store | Local integration + Chromium stale-conflict flow |
| Add local/provider-optional AI adapter boundary | WF-022 / ADR-0009 | Implementation | Validated | Provider configuration | AI boundary tests + no-cloud build |
| Make local runtime build without hosted credentials | ADR-0009 | Implementation | Validated | Next.js + SQLite native package | Typecheck + production build + Chromium |
| Retain PostgreSQL/Clerk hosted adapters as optional compatibility paths | ADR-0008 / ADR-0009 | Implementation | PostgreSQL compatibility validated; Clerk retained, non-blocking | Hosted mode requirements later | Optional compatibility tests |
| Migrate validated adaptive Interview onto local durable answer state | WF-023 / WF-024 | Implementation | Validated | M2 validated | Model parity + SQLite + Chromium |

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

Near-term work after M2 validation:

- migrate the validated adaptive Interview experience onto the local durable project model incrementally
- add a user-facing AI/provider settings screen instead of environment-only configuration
- add local project backup/export/import and migration/recovery UX
- evaluate one-click desktop packaging/installer options
- define the separate formal Artifact approval requirement and authorized project-owner workflow
- add provider-specific adapters beyond OpenAI-compatible endpoints when useful
- define hosted synchronization/collaboration only if approved as a separate product capability
- define hosted retention, deletion, consent, and age-related requirements before real hosted user-content release
