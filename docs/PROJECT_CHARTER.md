# Wayfound Project Charter

**Status:** Approved product-definition baseline  
**Active delivery state:** Increment 1 Validated; Increment 2 In progress under accepted ADR-0002 and ADR-0005

## 1. Product statement

Wayfound is a software-delivery guidance and coordination workspace for one capable domain expert who needs to turn a business problem into accountable software delivery with AI assistance, without needing to evaluate every technical detail independently.

Wayfound recommends the next useful action, helps the owner prepare and review work, and keeps decisions, artifacts, responsibilities, evidence, and release state connected from discovery through maintenance.

## 2. Problem

The target user can explain the problem and make business decisions but cannot independently evaluate every code, architecture, security, design, quality, or operational detail.

Without Wayfound, the user can lose continuity across conversations, documents, prototypes, AI tools, and delivery systems. The user can also confuse completed work with reviewed or verified work.

Wayfound addresses five persistent questions:

1. Where are we?
2. What is next?
3. What is mine to decide?
4. What demonstrates completion?
5. What changed?

## 3. Primary user and system actor

### Product owner

The first-version human user is one authenticated product owner: a capable domain expert, small business owner, or operational leader who understands the business problem, can make scope decisions, and needs clear guidance without pretending to have expertise that has not been established.

### AI assistant

AI is a system capability, not a second human participant and not an independent authority. AI may draft, analyze, recommend, review, summarize, and identify risk. AI output must remain distinguishable from owner-approved project records and from objective verification evidence.

An external human specialist may still be consulted outside Wayfound when the owner decides that independent expertise is necessary. The first version does not require that person to have a Wayfound account or participate inside the workspace.

## 4. Desired outcomes

Wayfound should help the product owner:

- understand the current release state;
- know the next useful action and why it matters;
- keep assumptions and unresolved issues visible;
- preserve accepted work when proposed work changes;
- use AI assistance without confusing AI output with accepted project truth;
- understand when independent evidence or external expertise is still required;
- distinguish implementation, review, verification, and release states;
- make a supported release decision;
- retain operating ownership after launch.

Numeric product-success targets remain `TBD` until user research establishes useful baselines.

## 5. First-version scope

### In scope

The first version is a responsive web workspace for one authenticated product owner. It includes:

- a 15-stage journey from clarification through maintenance;
- a recommended next action with visible reasoning and assumptions;
- structured problem, scope, decision, requirement, work, evidence, release, and maintenance records;
- versioned artifacts and portable project records;
- manual uploads and external references;
- requirement-to-acceptance-criterion-to-evidence links;
- explicit lifecycle and evidence states;
- dependency-aware impact review and outdated-evidence handling;
- release packets, concrete authorization records, deployment outcomes, and operating ownership;
- maintenance due items and recurring maintenance records;
- AI-assisted drafting, analysis, and recommendations that remain distinguishable from accepted records;
- durable provenance for consequential AI-assisted review when that capability enters an approved implementation slice.

### Deliberately deferred

The first version does not require:

- collaborator accounts, invitations, membership administration, or ownership transfer;
- human work assignment inside Wayfound;
- specialist reviewer accounts, reviewer-code exchange, or assignment-scoped human review inside Wayfound;
- manual specialist handoff and return workflows as a core product surface;
- verified direct connectors to specialist tools;
- automatic test-evidence ingestion from external pipelines;
- automatic repository change analysis;
- scheduling integrations;
- rich side-by-side document comparison;
- portfolio reporting;
- automatic production deployment or other production-changing actions.

Wayfound does not publish products, purchase services, or change production systems in the first version.

## 6. Product principles

1. **Continuity over fragmentation.** The project record must survive changes in tools and time.
2. **Accountability over ambiguity.** Important decisions, evidence, unresolved issues, and the human authority must be explicit.
3. **Clarity over cleverness.** Guidance must be understandable without weakening the underlying obligation.
4. **Evidence before confidence.** Completed work must not appear verified without current evidence.
5. **AI stays advisory.** AI may provide technical analysis, but AI output does not silently become independent expert review, accepted project direction, or verification evidence.
6. **Reversible change where practical.** Low-cost experiments are preferred when they can resolve uncertainty safely.
7. **Secure by design.** Trust boundaries, authorization, secrets, and sensitive data require deliberate treatment.
8. **Operational ownership is part of delivery.** Release is incomplete without clear operating responsibility.

## 7. Constraints

- The first release must work on phone and desktop web browsers.
- Imported or AI-generated work must not silently become accepted work.
- A failed import must not replace the accepted artifact.
- Status must not imply verification that did not occur.
- AI-generated technical analysis must not be presented as independent qualified human review.
- Consequential claims still require evidence appropriate to the claim before they can be represented as verified or validated.
- Commercial name clearance, market demand, pricing, and legal obligations remain outside the current evidence base unless separately verified.

## 8. Non-goals

Wayfound does not optimize for multi-user project collaboration, replacing every specialist, generating code as its primary value proposition, making unverified software appear safe, maximizing automation before continuity and evidence comprehension are validated, or forcing every project through the same level of ceremony.

## 9. Success measures

| Measure | Baseline | Target | Source | Review cadence |
| --- | --- | --- | --- | --- |
| User can identify the next action and explain why | TBD | TBD | Task-based research | Per prototype round |
| User can resume a project without reconstructing context | TBD | TBD | Pause/resume study | Per prototype round |
| User distinguishes completed, AI-reviewed, owner-accepted, verified, and outdated work | TBD | TBD | Comprehension test | Per prototype round |
| User can understand what AI recommended and what evidence supports the final state | TBD | TBD | Guided workflow trial | Per prototype round |

## 10. Decision rights

- The product owner approves product scope, business decisions, and project direction.
- AI provides advisory analysis and recommendations but does not hold approval authority.
- Objective evidence supports verification decisions; AI commentary alone does not establish verification.
- If the owner uses an external human specialist, that review may be recorded as external evidence without requiring a second Wayfound user account.
- The product owner makes the business release decision after required evidence and applicable review are available.
- Production-changing execution remains outside first-version automatic authority.
- The product owner retains ongoing operating responsibility unless a later approved scope explicitly introduces another accountable human role.

## 11. Current delivery target

Build and validate vertical slices that test the core single-user claims before deeper automation:

1. A user can orient to the current release quickly.
2. One recommended next action provides useful direction.
3. The project record makes evidence and unresolved assumptions understandable.
4. AI assistance can be used without obscuring which records the human owner accepted and which claims have objective verification evidence.

The illustrative Borrow Desk project remains the current prototype scenario where fixture-backed prototype routes are used.

## 12. Change rule

A material change to product purpose, primary user, first-version scope, AI authority boundary, or governing constraints must update this charter before or with implementation.
