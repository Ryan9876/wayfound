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
| Interview model | Defines starter questions, options, state transitions, derived state, and completion rules | In-memory Interview state semantics | JavaScript runtime | Decisions or derived state become incorrect |
| Project-state panel | Shows coverage, decisions, assumptions, blockers, and open questions | Presentation derived from Interview model | Interview model | User loses visibility into definition state |

The Interview model is intentionally separate from rendering logic so later adaptive question selection can replace the starter question bank without rebuilding the page shell.

## 4. Data model and authority

For the initial slice, the authoritative runtime state is a JavaScript object in the active browser page.

Important fields are:

- `idea` — the user's free-form starting description
- `step` — the current Interview position
- `answers` — selected option identifiers keyed by question identifier
- derived assumptions
- derived blockers
- derived open questions

Question definitions are static configuration in `app/interview-model.js`.

The browser session is temporary. Refreshing or closing the page can discard state. Persistence is not an approved requirement for this slice.

## 5. Interfaces and contracts

The initial component interface is local JavaScript function calls.

The Interview model exposes deterministic functions for:

- initial state creation
- answer selection
- selected-option lookup
- project-state derivation
- coverage calculation
- completion determination
- summary creation

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

Automated tests provide evidence for the Interview state model. Manual browser review is required for visual and interaction behavior until browser automation is added.

## 9. Deployment and environments

The initial slice is a static web application under `app/` and can be served by any basic static HTTP server.

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
| Interview question selection is a starter sequence | Planned evolution | The current flow is guided but not yet dynamically adaptive to free-form intent | Preserve question model separately and add adaptive selection in a later requirement | Project owner | Open |
| Browser-session state is temporary | Known limitation | Refresh or close can discard progress | Define persistence only after privacy and data authority are approved | Project owner | Open |
| Manual visual validation is still required | Validation gap | Automated state tests do not prove visual fidelity or interaction quality | Add browser-level test tooling in a later architecture decision or bounded test change | Project owner | Open |

## 14. Change rule

Architecture documentation and implementation must describe the same system. Update this file and any affected ADR when a change modifies a documented boundary, contract, dependency, data authority, deployment model, or failure behavior.
