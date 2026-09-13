# Wayfound Project Charter

**Status:** Approved product-definition baseline  
**Active delivery state:** Increment 1 Validated; Increment 2 identity and persistence decision Proposed

## 1. Product statement

Wayfound is a software-delivery guidance and coordination workspace for capable domain experts who need to turn a business problem into accountable software delivery without needing to evaluate every technical detail themselves.

Wayfound recommends the next useful action, prepares work for the right specialist or tool, and keeps decisions, artifacts, responsibilities, and verification evidence connected from discovery through maintenance.

## 2. Problem

The target user can explain the problem and make business decisions but cannot independently evaluate code, architecture, security, or technical safety.

Without Wayfound, the user can lose continuity across conversations, documents, prototypes, specialists, and delivery tools. The user can also confuse completed work with reviewed or verified work.

Wayfound addresses five persistent questions:

1. Where are we?
2. What is next?
3. What is mine to decide?
4. What demonstrates completion?
5. What changed?

## 3. Primary users

### Product owner

A capable domain expert, small business owner, or operational leader who understands the business problem, can make scope decisions, and needs clear guidance without pretending to be the technical reviewer.

### Specialist reviewer

A qualified person who reviews work within a defined area of competence. Examples include software engineering, architecture, security, design, quality assurance, data migration, and operations.

### Project collaborator

A contributor who adds context, work, or review input without holding final product ownership.

## 4. Desired outcomes

Wayfound should help a product owner:

- understand the current release state;
- know the next useful action and why it matters;
- keep assumptions and unresolved issues visible;
- preserve accepted work when proposed work changes;
- prepare bounded specialist handoffs;
- reconcile returned work against accepted scope and decisions;
- distinguish implementation, review, verification, and release states;
- make a supported release decision;
- retain operating ownership after launch.

Numeric product-success targets remain `TBD` until user research establishes useful baselines.

## 5. First-version scope

### In scope

The first version is a responsive web workspace with an authenticated product owner and invited collaborators. It includes:

- a 15-stage journey from clarification through maintenance;
- a recommended next action with visible reasoning and assumptions;
- structured problem, scope, decision, requirement, work, evidence, release, and maintenance records;
- versioned artifacts and portable project records;
- manual uploads and external references;
- manual specialist handoff packages and return reconciliation;
- requirement-to-acceptance-criterion-to-evidence links;
- named reviewer records;
- explicit lifecycle and evidence states;
- dependency-aware impact review and outdated-evidence handling;
- release packets, concrete authorization records, deployment outcomes, and operating ownership;
- maintenance due items and recurring maintenance records;
- AI-assisted drafting and recommendations that remain distinguishable from accepted records.

### Deliberately deferred

The first version does not require:

- verified direct connectors to specialist tools;
- automatic test-evidence ingestion from external pipelines;
- automatic repository change analysis;
- scheduling integrations;
- rich side-by-side document comparison;
- portfolio reporting;
- automatic production deployment or other production-changing actions.

Wayfound does not publish products, purchase services, or change production systems in the first version.

## 6. Product principles

1. **Continuity over fragmentation.** The project record must survive changes in tools, people, and time.
2. **Accountability over ambiguity.** Important decisions, owners, evidence, and unresolved issues must be explicit.
3. **Clarity over cleverness.** Guidance must be understandable without weakening the underlying obligation.
4. **Evidence before confidence.** Completed work must not appear verified without current evidence.
5. **Specialist work stays specialist work.** Wayfound coordinates qualified review; it does not imply expertise that has not been provided.
6. **Reversible change where practical.** Low-cost experiments are preferred when they can resolve uncertainty safely.
7. **Secure by design.** Trust boundaries, authorization, secrets, and sensitive data require deliberate treatment.
8. **Operational ownership is part of delivery.** Release is incomplete without named operating responsibility.

## 7. Constraints

- The first release must work on phone and desktop web browsers.
- Imported or AI-generated work must not silently become accepted work.
- A failed import must not replace the accepted artifact.
- Status must not imply verification that did not occur.
- Important technical consequences may require qualified specialist review.
- Commercial name clearance, market demand, pricing, and legal obligations remain outside the current evidence base unless separately verified.

## 8. Non-goals

Wayfound does not optimize for replacing every specialist, generating code as its primary value proposition, making unverified software appear safe, maximizing automation before continuity and evidence comprehension are validated, or forcing every project through the same level of ceremony.

## 9. Success measures

| Measure | Baseline | Target | Source | Review cadence |
| --- | --- | --- | --- | --- |
| User can identify the next action and explain why | TBD | TBD | Task-based research | Per prototype round |
| User can resume a project without reconstructing context | TBD | TBD | Pause/resume study | Per prototype round |
| User distinguishes completed, reviewed, verified, and outdated work | TBD | TBD | Comprehension test | Per prototype round |
| Manual specialist exchange can complete without lost scope or decisions | TBD | TBD | Handoff trial | Per handoff trial |

## 10. Stakeholders and decision rights

- The product owner approves product scope and business decisions.
- A qualified specialist reviews consequential technical decisions within that specialist's competence.
- The product owner makes the business release decision after required evidence and specialist reviews are available.
- The named release executor performs only the specifically authorized deployment action.
- The named operations owner accepts ongoing operating responsibility.

## 11. Current delivery target

Build and validate a prototype vertical slice that tests three core claims before deeper automation:

1. A user can orient to the current release quickly.
2. One recommended next action provides useful direction.
3. The project record makes evidence and unresolved assumptions understandable.

The illustrative Borrow Desk project is the current prototype scenario.

## 12. Change rule

A material change to product purpose, primary users, first-version scope, or governing constraints must update this charter before or with implementation.
