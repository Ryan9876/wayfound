# ADR-0004 — Technical decision review and acceptance authority

**Status:** Accepted  
**Date:** 2026-09-13  
**Decision owner:** Ryan Smith

## Decision

Adopt a split-authority model for consequential technical decisions.

A current workspace owner may record a **technical choice proposal**. An assigned authenticated specialist reviews the exact proposal revision within a declared competence area. The proposal becomes eligible for acceptance only when that exact revision has a completed specialist review with conclusion `No blocking finding`. The current workspace owner must then perform a separate explicit acceptance action before the choice becomes an accepted technical decision and project direction.

`No blocking finding` is therefore a required review result, not an approval action. `Changes required` blocks acceptance of that exact proposal revision. `Advisory` does not satisfy the acceptance gate.

## Context

The approved charter separates product-owner authority from qualified specialist review. It states that a qualified specialist reviews consequential technical decisions within that specialist's competence. Existing durable owner-decision and owner-requirement actions deliberately reject consequential technical choices.

ADR-0003 proves assignment-scoped specialist review without granting general workspace membership. That review model currently targets an exact accepted artifact version and explicitly states that specialist conclusions do not establish product-owner acceptance, verification, validation, release readiness, or production authorization.

The repository did not define the acceptance boundary for consequential technical choices. Specifically, it did not define:

- who may create a technical choice before it is accepted;
- which specialist result is sufficient to make that choice eligible for acceptance;
- who converts reviewed technical guidance into project direction;
- whether a blocking specialist finding can be overridden through the owner action;
- what happens when the proposal changes after review.

The glossary defines a `decision` as an approved choice. Therefore, an unapproved technical choice must not be stored or presented as an accepted decision.

## Decision drivers

The authority model must:

- preserve the product owner's accountability for project direction;
- require qualified judgment for consequential technical choices;
- prevent specialist review from silently becoming project acceptance;
- prevent an owner-only action from bypassing a blocking technical finding;
- preserve ADR-0003 assignment-scoped authorization without adding specialist workspace membership;
- bind review to the exact content that is later accepted;
- make later material changes require renewed review instead of inheriting stale approval;
- keep acceptance, review, verification, validation, release, and production authorization distinct.

## Options considered

### Option A — Specialist gate, owner acceptance — selected

**Summary:** The owner records a technical choice proposal. An assigned qualified specialist reviews the exact proposal revision. `No blocking finding` makes that revision eligible. The owner must then explicitly accept it as project direction.

**Advantages:**

- Preserves product-owner accountability for project direction.
- Preserves qualified specialist authority over technical judgment.
- Keeps review and acceptance as separate durable events.
- Prevents a blocking finding from being converted into accepted direction by an owner-only command.
- Fits the assignment-scoped identity and authorization boundary in ADR-0003.
- Provides a clear stale-review rule when proposal content changes.

**Disadvantages:**

- Requires two explicit actions after proposal creation: specialist review and owner acceptance.
- Requires durable linkage among proposal revision, review, and accepted technical decision.

**Risks:**

- Poor UI wording could imply that the owner validates technical correctness. The interface must state that the owner accepts project direction after required qualified review; the specialist owns the technical judgment.

### Option B — Specialist review automatically accepts the technical decision

**Summary:** A specialist conclusion of `No blocking finding` immediately makes the choice accepted project direction.

**Advantages:**

- Fewer user actions.
- Strong specialist control of technical direction.

**Disadvantages:**

- Transfers project-direction authority from the product owner to the specialist.
- Conflicts with ADR-0003, which says specialist review does not establish product-owner acceptance.
- Makes review and acceptance one event, reducing traceability.

**Risks:**

- A specialist could unintentionally commit the project to a technically sound choice with unacceptable business, cost, timing, or operating consequences.

### Option C — Owner may accept after any completed specialist review

**Summary:** The specialist review must exist, but the owner may accept after `No blocking finding`, `Changes required`, or `Advisory`.

**Advantages:**

- Preserves owner discretion.
- Avoids a hard technical gate.

**Disadvantages:**

- Makes the qualified-review requirement procedural rather than substantive.
- Allows the owner to accept a choice that the qualified reviewer explicitly says requires change.

**Risks:**

- Weakens `WF-OWN-001` and the charter requirement for qualified review of consequential technical decisions.

### Option D — Specialist alone accepts the technical decision

**Summary:** The assigned specialist performs both review and final acceptance.

**Advantages:**

- Clear technical authority.

**Disadvantages:**

- Removes the product owner from project-direction acceptance.
- Conflates technical judgment with business accountability.

**Risks:**

- A specialist becomes responsible for consequences outside the declared competence and review question.

## Rationale

Use Option A.

Wayfound must answer two different questions for a consequential technical choice:

1. **Qualified review:** Does a specialist identify a blocking technical finding within the declared review scope?
2. **Project direction:** Does the product owner accept this reviewed choice and its consequences as the direction the project will follow?

The same actor should not implicitly answer both questions. A specialist should not accept business direction merely by completing a review. An owner should not bypass a blocking qualified finding through an owner-only mutation.

`No blocking finding` is the minimum review conclusion that can open the owner acceptance action. It does not assert technical correctness beyond the review scope and does not establish verification or validation.

## Authority model

### Proposal authority

Only a current authenticated workspace owner may create a technical choice proposal in the bounded slice. The proposal is not an accepted decision and must be labeled `Proposed` in text.

A proposal must contain enough bounded context for qualified review, including:

- title;
- technical choice statement;
- rationale and alternatives considered;
- material constraints and consequences known to the owner;
- requested competence area;
- one bounded review question;
- immutable proposal identifier and revision.

This slice does not add collaborator or specialist proposal authority.

### Review authority

The current owner assigns a reviewer code to the exact technical choice proposal revision. The assignment-scoped authorization principles from ADR-0003 apply:

- the reviewer code grants no workspace membership;
- only the assigned authenticated specialist may submit the review;
- the specialist acts only within the declared competence and review question;
- caller-supplied reviewer authority is not trusted.

The specialist review uses the existing conclusion vocabulary:

- `No blocking finding`;
- `Changes required`;
- `Advisory`.

### Acceptance authority

Only the current authenticated workspace owner may accept a technical choice proposal as project direction.

Acceptance requires all of the following at the time of the transaction:

- the proposal is still `Proposed`;
- the owner is still a current explicit owner member;
- the proposal revision matches the reviewed revision;
- the required specialist assignment is complete;
- the linked review belongs to the assigned authenticated specialist;
- the linked review conclusion is `No blocking finding`;
- the owner explicitly confirms that they are accepting the reviewed technical choice as project direction, not claiming independent technical verification.

The owner acceptance action creates or records an `Accepted` technical decision and durable linkage to the exact proposal and specialist review that satisfied the gate.

The specialist review must not automatically accept the proposal.

### Blocking and advisory findings

`Changes required` makes the reviewed proposal revision ineligible for owner acceptance. The owner cannot override that conclusion through this bounded action.

`Advisory` records useful qualified guidance but does not make the proposal revision eligible for acceptance.

A proposal that does not have `No blocking finding` remains proposed. A later bounded slice may add richer review reassignment or dispute handling. This ADR does not create an owner override path.

### Changed proposals and accepted decisions

A material content change after review makes the prior review stale for acceptance. The changed proposal must receive a new exact-revision specialist review before owner acceptance.

A material change to an already accepted technical decision must not overwrite that accepted record. The changed direction must enter as a new proposal and repeat qualified review and owner acceptance. The previously accepted technical decision remains the current durable record until an approved replacement/supersession flow changes it.

Replacement, dependency impact, and supersession behavior are outside the first bounded implementation slice unless separately specified and approved. The authority rule remains: a material replacement cannot inherit the prior `No blocking finding` review.

## Persistence and security consequences

The implementation must preserve the current private `wayfound` schema, row-level security, direct-table denial, public `SECURITY INVOKER` wrappers, narrow private `SECURITY DEFINER` transactions with `search_path = ''`, fully qualified object names, live-session checks, and no application service key.

Do not widen `wayfound.memberships` to specialists for this slice. Existing owner mutations still contain generic membership predicates in places. Technical review must remain assignment-scoped until a separate role-aware membership redesign is approved and regression tested.

A technical decision acceptance transaction must lock and verify the exact proposal revision and required review. It must record acceptance, audit history, and idempotent request result atomically. Identical request UUID and normalized payload must return the original result. Changed request reuse must fail. Authorization must still be checked before idempotent replay is returned.

The existing bounded retry remains limited to exact PostgREST `PGRST303` with message `JWT issued at future`.

## Consequences

### Positive

- Wayfound can support consequential technical decisions without pretending the owner is the technical reviewer.
- The owner retains project-direction accountability.
- Blocking technical findings have real effect.
- Review evidence remains exact-revision and auditable.
- The model extends ADR-0003 without broadening membership roles.

### Negative

- The flow adds explicit proposal, review, and acceptance records.
- A `Changes required` or `Advisory` result cannot be bypassed through the bounded owner action.
- Later replacement/supersession needs a separate lifecycle slice.

### Neutral or accepted constraints

- `No blocking finding` is scoped judgment. It is not `Verified`, `Validated`, or `Released`.
- Owner acceptance is project-direction acceptance. It is not independent technical verification.
- Technical requirement review should reuse this split-authority principle, but requires its own bounded specification after this decision is accepted.

## Reversibility

The authority policy is reversible by a later approved ADR, but changing it after technical decisions exist would require migration and reinterpretation of historical authority records. Therefore, the boundary was approved before durable technical-decision state was implemented.

## Validation

Implementation validation must prove at minimum:

- only a current owner can create a technical choice proposal;
- proposal creation does not create an accepted decision;
- reviewer identity and access remain assignment-scoped with no workspace membership;
- only the assigned live specialist can review the exact proposal revision;
- `Changes required` and `Advisory` cannot satisfy the owner acceptance command;
- `No blocking finding` alone does not accept the proposal;
- only a current owner can perform the separate acceptance action;
- acceptance fails if proposal content/revision changed after review;
- accepted technical decision links the exact proposal, review, reviewer, accepting owner, and timestamps;
- specialist review and owner acceptance do not alter verification, validation, release, or production authorization state;
- tenant isolation, session/sign-out/expiry/revocation denial, direct-table denial, idempotency, concurrency, rollback, restart/re-login persistence, and database interruption/recovery;
- external reference data is not fetched or executed where applicable;
- TypeScript, production build, security advisor, prior durable regression chain, keyboard access, and desktop/390 px rendering pass.

## Reconsideration triggers

Revisit this decision if:

- the project adopts role-aware specialist workspace membership;
- a governance requirement assigns final technical direction to a named technical authority instead of the product owner;
- multiple mandatory specialist disciplines must jointly gate one technical decision;
- the system needs a formal exception/waiver path for blocking findings;
- accepted technical-decision replacement and impact analysis require a more general versioned decision model.

## Related sources

- `docs/PROJECT_CHARTER.md`
- `docs/PRODUCT_REQUIREMENTS.md` — `WF-OWN-001`, `WF-REC-001`, `WF-REC-002`
- `docs/INCREMENT_2_DECISIONS.md`
- `docs/INCREMENT_2_REQUIREMENTS.md`
- `docs/INCREMENT_2_SPECIALIST_REVIEW.md`
- `docs/adr/0002-durable-workspace-identity.md`
- `docs/adr/0003-assignment-scoped-specialist-review.md`
- PR #1

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-13 | Proposed | The repository required qualified specialist review for consequential technical choices but did not yet define the acceptance authority or blocking-result gate. |
| 2026-09-13 | Accepted | Ryan Smith approved Option A: exact-revision `No blocking finding` specialist review is required, followed by separate explicit owner acceptance as project direction. |
