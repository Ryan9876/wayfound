# Wayfound

Wayfound is managed as a spec-driven project. The repository is the authoritative source for product definition, architecture, delivery decisions, and implementation.

## Start here

1. Read `AGENTS.md` before making or proposing changes.
2. Read `docs/PROJECT_CHARTER.md` to understand the product purpose, scope, and constraints.
3. Read `docs/PRODUCT_REQUIREMENTS.md` for approved requirements and acceptance criteria.
4. Read `docs/ARCHITECTURE.md` for approved technical boundaries and decisions.
5. Read `docs/DELIVERY_PLAN.md` for current priorities and work sequence.
6. Read `docs/QUALITY.md` for the definition of done and validation requirements.
7. Record consequential architecture decisions as ADRs under `docs/adr/`.

## Source-of-truth order

When sources conflict, use this precedence:

1. Current explicit project instruction from the project owner
2. `AGENTS.md`
3. Approved ADRs in `docs/adr/`
4. `docs/PROJECT_CHARTER.md`
5. `docs/PRODUCT_REQUIREMENTS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DELIVERY_PLAN.md`
8. Implementation and tests
9. Issues, pull-request discussion, chat history, and memory

Do not silently resolve a material conflict. State the conflict and update the authoritative source as part of the change.

## Project files

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Operating instructions for AI agents and contributors |
| `docs/PROJECT_CHARTER.md` | Product purpose, users, outcomes, scope, and constraints |
| `docs/PRODUCT_REQUIREMENTS.md` | Functional and non-functional requirements |
| `docs/ARCHITECTURE.md` | System design, boundaries, interfaces, and technical constraints |
| `docs/DELIVERY_PLAN.md` | Priorities, milestones, work packages, and status |
| `docs/QUALITY.md` | Definition of done, testing, security, observability, and release gates |
| `docs/COMMUNICATION_STANDARD.md` | Wayfound communication standard based on ASD-STE100 and the Minto Pyramid Principle |
| `docs/adr/0000-template.md` | Architecture Decision Record template |
| `CONTRIBUTING.md` | Change workflow and pull-request expectations |

## Current state

The governance structure is initialized. Product-specific content that is not yet known is marked `TBD`. Do not convert a `TBD` into an asserted fact without an explicit decision or supporting source.