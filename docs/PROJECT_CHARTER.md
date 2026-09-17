# Wayfound Project Charter

**Status:** Draft

## Purpose

This file defines why Wayfound exists, who it serves, the outcomes it must produce, and the boundaries that control the project.

Do not place detailed implementation design in this file. Put technical design in `ARCHITECTURE.md` and detailed behavior in `PRODUCT_REQUIREMENTS.md`.

## 1. Product statement

Wayfound is a guided building workspace for people with varied technical experience that turns an idea, problem, or change into a clear and traceable path to something they can build and validate.

Wayfound does this by asking focused questions, explaining why each decision matters, recording decisions and unknowns, and carrying that context into later planning, implementation, validation, and release work.

## 2. Problem

People often begin with an incomplete idea and are asked to make technical or product decisions before they know which decisions matter. This can create hidden assumptions, unnecessary complexity, or work that starts before the intended outcome is clear.

Wayfound must help a user make enough good decisions to move forward without requiring the user to understand a formal software-development process first.

## 3. Primary users

Wayfound is intended for people who want to make, fix, or improve something with technology. Users can have different levels of technical experience.

Initial user groups include:

- first-time and younger builders who need plain language and guided choices
- hobbyists and independent makers who need structure without heavy process
- experienced technical users who need traceable decisions, requirements, and validation
- teams that want a shared record of why work exists and how it was validated

The interface must not assume that the project is a business application.

## 4. Desired outcomes

Wayfound should help users:

- explain what they want to make, fix, or improve in their own words
- identify the next material decision instead of answering a long generic questionnaire
- understand a recommended choice and its tradeoff before accepting it
- keep facts, assumptions, decisions, blockers, and open questions distinct
- know when enough is understood to move to the next stage
- preserve traceability from early decisions into later requirements, work, validation, and release records

Numeric success targets remain `TBD` until valid measures are defined.

## 5. Scope

### In scope

For the initial delivery target:

- an Interview page that accepts a rough idea, problem, or change request
- guided questions presented one decision at a time
- recommended choices with plain-language rationale and tradeoffs
- friendly language suitable for non-experts without making the experience childish
- visible interview progress and project state
- explicit decisions, assumptions, blockers, and open questions
- a session-only Records view that projects Interview decisions and unresolved state into traceable records
- a completion summary that identifies the next recommended action
- adaptive question selection based on the user’s idea and prior choices so irrelevant questions can be skipped
- a structured interview model that can later support richer semantic or AI-assisted question selection without replacing the user-facing workflow

### Out of scope

For the initial delivery target:

- production deployment
- user accounts or identity
- cloud persistence
- external AI or model calls
- automatic code generation or execution
- external integrations
- final production architecture selection

These exclusions keep the first slice reversible and prevent the prototype from establishing unapproved trust, data, or deployment boundaries.

## 6. Product principles

The following baseline principles apply unless an approved decision changes them:

1. **Clarity over cleverness** — users and maintainers must be able to understand the system.
2. **Explicit ownership** — data, actions, and operational responsibilities must have clear owners.
3. **Traceable decisions** — consequential product and architecture decisions must be recorded.
4. **Validated behavior** — implementation is not complete until required behavior is verified.
5. **Reversible change where practical** — prefer designs that reduce the cost of correction.
6. **Secure by design** — trust boundaries, access, secrets, and sensitive data must be deliberate.
7. **Operational visibility** — important failures must be observable and diagnosable.
8. **Friendly without being childish** — use plain, welcoming language and light humor where it improves the experience, while preserving precision.
9. **Unknown is a valid state** — Wayfound must make uncertainty visible instead of forcing an unsupported answer.

## 7. Constraints

For the initial Interview slice:

- The visual design must use the established Wayfound design language and brand tokens.
- The user-facing language must work for projects beyond business applications.
- The first slice must not send interview content to an external service.
- The first slice must not persist personal information outside the current browser session.
- Production privacy, identity, data-retention, and age-related requirements remain `TBD` before any hosted service stores or externally processes user content.

## 8. Non-goals

Wayfound does not optimize for:

- forcing every user through the same long questionnaire
- removing all uncertainty before work can proceed
- replacing user judgment with opaque recommendations
- treating implementation as complete only because an agent or builder says it is done

## 9. Success measures

Initial measures are qualitative until instrumentation and valid targets are approved.

| Measure | Baseline | Target | Source | Review cadence |
| --- | --- | --- | --- | --- |
| User can complete the first Interview flow | No implemented flow | Pass defined acceptance criteria | Manual and automated validation | Each material change |
| User can see decisions and unresolved state | No implemented flow | Pass defined acceptance criteria | Manual and automated validation | Each material change |
| Tone works across project types | No implemented flow | Objectively review against language requirement | UX review | Each material change |

## 10. Stakeholders and decision rights

**Project owner:** approves product scope, primary behavior, and material product-direction changes.

Additional decision rights for architecture, security exceptions, release readiness, and production changes remain `TBD` before production delivery.

## 11. Open decisions

| Decision | Why it matters | Owner | Needed by | Status |
| --- | --- | --- | --- | --- |
| Define Wayfound product statement | Establishes the project boundary | Project owner | Initial Interview slice | Resolved for current scope |
| Define primary users and core problem | Controls requirements and UX priorities | Project owner | Initial Interview slice | Resolved for current scope |
| Define initial delivery target | Controls sequencing and architecture depth | Project owner | Initial Interview slice | Resolved: guided Interview vertical slice |
| Select production architecture | Controls persistence, integrations, deployment, and operations | Project owner | Before production build | Open |
| Define hosted-service privacy and age-related controls | Required before storing or externally processing user content | Project owner | Before hosted persistence or AI processing | Open |

## 12. Change rule

A material change to product purpose, primary users, scope, or governing constraints must update this charter before or with implementation.
