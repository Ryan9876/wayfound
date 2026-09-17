# Wayfound Architecture

**Status:** Draft

## Purpose

This file describes the approved technical structure of Wayfound. It records system boundaries, major components, interfaces, data authority, operational behavior, and technical constraints.

Use an Architecture Decision Record (ADR) for consequential decisions that explain why the architecture has a specific form.

## 1. Architecture summary

For the initial Interview vertical slice, Wayfound uses a dependency-free static browser application with separate presentation and interview-state modules. The browser owns temporary Interview state for the active page session. The prototype has no server, external service, production data store, identity provider, or external AI dependency.

This is a bounded prototype architecture. It does not select the final Wayfound production framework, backend, database, hosting platform, identity model, or AI provider.

## 2. System context

### Users and external actors

The initial slice has one actor: a user who enters an idea and makes guided decisions in the browser.

The user can have different technical experience and can be working on a game, hobby project, school project, business application, internal tool, or technical system.

### External systems

None in the initial slice.

### Trust boundaries

The initial slice keeps all Interview content in browser memory. No Interview content crosses a network trust boundary.

A future external AI call, persistence service, account system, or integration would introduce a new trust boundary and must be specified before implementation.

## 3. Major components

| Component | Responsibility | Owns | Depends on | Failure effect |
| --- | --- | --- | --- | --- |
| Wayfound shell | Provides navigation, layout, brand styling, and page framing | Presentation only | Browser standards | Page layout or navigation is degraded |
| Interview renderer | Presents prompts, choices, recommendations, progress, and summary | Current rendered view | Interview model | User cannot complete the guided flow |
| Idea classifier | Detects broad routing signals from the free-form idea | Temporary routing tags | JavaScript runtime | Wayfound can ask less-relevant questions |
| Question registry | Defines possible questions, applicability rules, priority, recommendations, options, and tradeoffs | Interview question policy | Idea classifier and Interview state | Required decisions can be skipped or unnecessary questions can appear |
| Question selector | Chooses the highest-priority unanswered required question that currently applies | Current question selection | Question registry and Interview state | Interview order or completion can become incorrect |
| Interview model | Owns answers, history, applicability, derived state, progress, and completion rules | In-memory Interview state semantics | JavaScript runtime | Decisions or derived state become incorrect |
| Project-state panel | Shows dynamic coverage, choices, guesses, blockers, and open questions | Presentation derived from Interview model | Interview model | User loses visibility into definition state |
| Record projector | Converts applicable Interview choices and derived uncertainty into typed records with deterministic identifiers | Derived record view | Interview model | Traceability view can become incomplete or misleading |
| Records renderer | Shows the current session record projection and record counts | Presentation only | Record projector | User cannot inspect the current traceability record |
| Draft artifact projector | Converts current Records into a draft brief, Journey steps, requirement candidates, and follow-up work while preserving source record IDs | Derived draft artifacts | Current Records | Preview can become incomplete or misleading |
| Draft artifact renderer | Shows generated artifacts behind an explicit draft-only boundary | Presentation only | Draft artifact projector | User cannot inspect possible next artifacts |
| Artifact review model | Tracks session-only Draft / Proposed / Set aside dispositions for actionable draft requirements and work, bound to artifact content signatures | Derived review state | Draft artifact projector | Stale or misleading proposal state can survive artifact changes |
| Artifact review renderer | Shows proposal controls and review counts without changing source Records or draft generation | Presentation only | Artifact review model | User cannot explicitly carry forward or set aside actionable drafts |

The classifier and selector are intentionally local and deterministic in this slice. They prove adaptive behavior without selecting an external AI provider or creating a new data-processing boundary.

## 4. Data model and authority

For the initial slice, the authoritative runtime state is a JavaScript object in the active browser page.

Important fields are:

- `idea` — the user's free-form starting description
- `started` — whether the Interview has begun
- `currentQuestionId` — the currently selected applicable question
- `history` — the visited question identifiers used for review/back navigation
- `complete` — whether the current adaptive pass is at its completion view
- `answers` — selected option identifiers keyed by question identifier
- derived routing tags
- derived assumptions
- derived blockers
- derived open questions

Question definitions remain static configuration in `app/interview-model.js`, but each question now defines applicability, priority, required state, recommendation logic, and user-facing options. Progress and completion are calculated only from questions that currently apply.

Records are a deterministic projection of Interview state, not an independent authority. Decision records use semantic identifiers such as `DEC-OUTCOME`; derived assumption, blocker, and open-question identifiers use deterministic content-based suffixes.

Draft build artifacts are a second-level projection of current Records. They remain `draft`, retain their source record identifiers, and do not become authoritative requirements, Journey state, or committed Work merely because they are generated.

Artifact review state is a separate, session-only overlay on reviewable draft requirements and draft work. `Proposed` means carry forward for project-owner review; it does not mean approved. Review state is bound to an artifact content signature so a materially changed artifact returns to Draft instead of inheriting stale proposal state.

The browser session is temporary. Refreshing or closing the page can discard Interview state and its derived records. Persistence is not an approved requirement for this slice.

## 5. Interfaces and contracts

The initial component interface is local JavaScript function calls.

The Interview model exposes deterministic functions for:

- broad idea classification
- initial state creation
- question applicability and resolution
- next-question selection
- answer selection
- adaptive advance, back, and review navigation
- project-state derivation
- dynamic progress calculation
- completion determination
- summary creation
- structured record projection for decisions, assumptions, blockers, and open questions
- draft artifact projection from Records into brief, Journey, requirement-candidate, and follow-up-work views

There are no remote interfaces in the initial slice.

## 6. Security architecture

The initial slice:

- has no authentication or authorization
- contains no secrets
- performs no protected actions
- sends no user content to external systems
- stores no user content outside the active browser session

Before Wayfound introduces hosted persistence, accounts, external AI processing, or integrations, the project must define the applicable identity, authorization, privacy, data-retention, and age-related controls.

## 7. Reliability and failure model

The initial slice has no remote dependency failures.

Local failure behavior includes:

- The user cannot advance from the idea step with empty input.
- The user cannot advance from a decision step until an option is selected.
- Derived state is calculated from explicit answers instead of hidden mutable flags.

Browser refresh recovery is not included in the initial slice.

## 8. Observability

Production observability is not applicable to the static initial slice.

Automated tests provide evidence for the Interview state model. The adaptive slice also has local headless-browser validation for visual and interaction behavior. A repeatable browser suite is not yet committed to CI.

## 9. Deployment and environments

The initial slice is a static web application under `app/` and can be served by any basic static HTTP server. Interview and Records are client-side views over the same in-memory state; switching views does not cross a network boundary.

No production hosting platform is selected. Deployment, environment promotion, secrets, migrations, rollout, and rollback remain `TBD` for a future production architecture decision.

## 10. Performance and capacity

No numeric targets are approved. The initial slice has a small static asset footprint and no server-side workload.

## 11. Technology choices

The initial slice uses standards-based HTML, CSS, and JavaScript with no runtime dependencies.

This is a reversible prototype choice, not the final production framework selection. A future foundational framework, database, hosting platform, or external AI provider must meet the ADR triggers below.

## 12. Architecture decision triggers

Create an ADR when a change:

- changes a system or ownership boundary
- selects or replaces a foundational framework, database, hosting platform, or major external service
- changes the authentication or authorization model
- changes the authoritative data source
- introduces a difficult migration
- materially changes deployment or rollback behavior
- accepts a significant security, reliability, cost, or maintainability tradeoff
- is expensive to reverse

## 13. Known risks and technical debt

| Item | Type | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Production architecture not yet selected | Open decision | Prototype cannot be treated as production architecture | Select production boundaries after the Interview slice is validated | Project owner | Open |
| Local intent classification uses bounded keyword/rule signals | Known limitation | An idea can be under-tagged or over-tagged, which can make a question appear too early or be skipped | Keep routing hints visible and non-authoritative; validate representative idea types; consider richer semantic classification only after its trust and privacy boundaries are approved | Project owner | Open |
| Browser-session state is temporary | Known limitation | Refresh or close can discard progress | Define persistence only after privacy and data authority are approved | Project owner | Open |
| Records are derived, session-only views | Known limitation | Records cannot yet be shared, reopened, or referenced across sessions | Add persistence only after authoritative data ownership, identity, retention, and privacy are approved | Project owner | Open |
| Draft artifacts are suggestions, not approved state | Governance boundary | Users could mistake generated candidates for approved requirements or committed work | Keep `draft` status and source IDs visible; require an explicit future promotion/approval workflow before authority changes | Project owner | Open |
| Proposed artifact review state is session-only and non-authoritative | Governance boundary | A user could mistake Proposed for Approved or carry stale proposal state after source changes | Label Proposed as pending project-owner review; reject Approved in this layer; bind dispositions to artifact content signatures; reset changed artifacts to Draft | Project owner | Open |
| Browser validation is not yet committed as a repeatable CI suite | Validation gap | Local browser review proves the current change but does not automatically protect every future UI change | Add browser-level automated interaction/accessibility tests when the project selects its production test tooling | Project owner | Open |

## 14. Change rule

Architecture documentation and implementation must describe the same system. Update this file and any affected ADR when a change modifies a documented boundary, contract, dependency, data authority, deployment model, or failure behavior.
