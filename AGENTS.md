# Wayfound Project Instructions

## 1. Purpose

These instructions govern all work on Wayfound by people and AI agents.

The goal is to make Wayfound easy to understand, change, test, operate, and hand off. Use the repository as the project record. Do not rely on chat history or memory when an authoritative repository source exists.

## 2. Required communication method

All Wayfound communication must combine two methods:

- **ASD-STE100 Simplified Technical English principles** for sentence-level clarity.
- **Minto Pyramid Principle** for information structure and reasoning.

Apply these methods to project discussions, specifications, requirements, architecture notes, issues, pull requests, status reports, code-review summaries, incident notes, release notes, and user-facing technical explanations.

### 2.1 Minto structure: answer first

Start with the conclusion, recommendation, decision, or current state.

Then provide the minimum supporting information required to understand or act on it. Group related ideas. Put supporting details below the point they support.

Use this default order when it fits the subject:

1. **Conclusion or current state**
2. **Why it matters**
3. **Evidence or facts**
4. **Risks and tradeoffs**
5. **Required action or next step**

For a problem or proposal, use Situation-Complication-Question-Answer when it improves clarity:

- **Situation:** relevant stable context
- **Complication:** what changed, failed, or created a decision
- **Question:** the question that must be answered
- **Answer:** the recommended response

Do not force SCQA when a direct answer is clearer.

At each level of a document:

- State one governing idea.
- Group only ideas that belong together.
- Make each group collectively support the idea above it.
- Order sibling ideas logically: priority, sequence, cause/effect, comparison, or another explicit rule.
- Prefer synthesis over a list of disconnected observations.

### 2.2 ASD-STE100 principles: make each sentence easy to interpret

Use ASD-STE100 principles as the Wayfound technical-writing baseline. Unless a formal STE compliance check is performed, describe the result as **STE-informed**, not formally ASD-STE100 compliant.

Use these rules:

- Use one word for one intended meaning where practical.
- Prefer common, precise words over jargon, idioms, slang, metaphors, and fashionable terms.
- Define necessary Wayfound-specific terms before repeated use.
- Use the same term consistently. Do not rotate synonyms for style.
- Keep sentences short enough to hold one clear idea.
- Prefer active voice when the actor is known and important.
- State the actor, action, object, condition, and result when they matter.
- Use imperative verbs for instructions.
- Put conditions before or next to the action they control.
- Avoid vague pronouns when the referent could be unclear.
- Avoid ambiguous modifiers and long noun chains.
- Use positive instructions when practical. If a prohibition is necessary, state what must not happen and why.
- Use lists for parallel items, procedures, acceptance criteria, and alternatives.
- Use consistent names for components, states, commands, files, roles, and interfaces.
- Do not use an acronym before defining it, except for universally understood project terms.
- Make units, dates, versions, identifiers, paths, and commands explicit.

### 2.3 Combined Wayfound pattern

Use this pattern for most technical responses:

**Decision / state**

State the answer in one or two sentences.

**Reasoning**

Give the smallest set of grouped reasons that support the answer.

**Impact / risk**

State service, user, security, data, cost, schedule, or operational effects that matter.

**Next action**

State the owner and next concrete action when an action is required.

Do not bury the conclusion after background material.

## 3. Source-of-truth hierarchy

Use this precedence when information conflicts:

1. Current explicit instruction from the project owner
2. `AGENTS.md`
3. Approved ADRs under `docs/adr/`
4. `docs/PROJECT_CHARTER.md`
5. `docs/PRODUCT_REQUIREMENTS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DELIVERY_PLAN.md`
8. Current implementation and automated tests
9. Issues, pull-request comments, chat history, and memory

A lower source must not silently override a higher source.

If implementation and an approved specification differ, identify the difference. Then determine whether the implementation is wrong or the specification needs an approved update.

## 4. Spec-driven development workflow

Use this sequence for material changes:

1. **Understand** — read the authoritative project files and the affected implementation.
2. **Define** — identify the user or system outcome, constraints, and acceptance criteria.
3. **Resolve** — expose contradictions, missing ownership, unknowns, and material assumptions.
4. **Specify** — update the relevant requirement, architecture section, or ADR before or with the implementation.
5. **Plan** — break the work into the smallest coherent sequence that can be validated.
6. **Implement** — make the smallest change that satisfies the approved requirement.
7. **Validate** — run applicable tests and inspect failure modes, security, observability, rollback, and user impact.
8. **Reconcile** — update project records so documentation and implementation describe the same system.
9. **Report** — communicate the outcome using the Wayfound communication standard.

Do not implement a material product or architecture assumption as if it were approved.

## 5. Requirements rules

Every material requirement must be testable or objectively reviewable.

A requirement should identify, when applicable:

- actor or system
- trigger or precondition
- required behavior
- expected result
- failure behavior
- constraints
- acceptance criteria

Use `MUST` for required behavior, `SHOULD` for a strong default with permitted exceptions, and `MAY` for optional behavior. Do not use these terms casually.

Do not invent metrics, user needs, integrations, security requirements, deadlines, or scope. Mark unknown items `TBD` and identify what decision is needed.

## 6. Architecture rules

For architecture changes, consider:

- system boundaries and ownership
- data flow and data authority
- interfaces and contracts
- authentication and authorization
- secrets and sensitive data
- failure modes and degraded behavior
- retries, idempotency, and concurrency where relevant
- observability and diagnosability
- performance and capacity
- deployment and rollback
- compatibility and migration
- vendor or external-service dependencies
- operational support burden

Create an ADR when a decision is costly to reverse, changes a system boundary, introduces a major dependency, selects a foundational technology, changes a security model, or resolves a consequential tradeoff.

## 7. Implementation rules

- Prefer simple, explicit designs over unnecessary abstraction.
- Preserve established conventions unless there is a documented reason to change them.
- Keep configuration separate from code when practical.
- Do not commit secrets, credentials, tokens, private keys, or sensitive production data.
- Validate external input at trust boundaries.
- Make important failures visible. Do not silently swallow errors.
- Add or update tests for changed behavior when practical.
- Do not perform unrelated refactoring inside a focused change unless it is required for correctness.
- Keep rollback or recovery in mind for changes that can affect persistent data or deployed service behavior.

## 8. Decision discipline

Separate:

- **Fact:** supported by an authoritative source or direct observation.
- **Assumption:** believed for planning but not yet verified.
- **Interpretation:** conclusion drawn from facts.
- **Decision:** selected course of action.
- **Open question:** unresolved item that can materially affect the outcome.

When options exist, compare them against explicit criteria. Recommend one option when the evidence supports it. State what would change the recommendation.

Do not continue analysis only to remove low-value uncertainty. For reversible decisions, prefer a bounded experiment with clear validation criteria.

## 9. Change management

A complete change must leave the project in a coherent state.

Before declaring work complete:

- confirm the requirement is satisfied
- confirm acceptance criteria pass
- run applicable automated checks
- review relevant failure paths
- update affected source-of-truth documents
- add or update an ADR when required
- record remaining risks or follow-up work
- state what changed and how it was validated

## 10. Status reporting

Use these status terms consistently:

- **Proposed** — defined but not approved
- **Approved** — accepted for implementation
- **In progress** — active implementation or validation
- **Blocked** — cannot proceed without a named dependency or decision
- **Implemented** — code or configuration is complete
- **Validated** — acceptance criteria and required checks passed
- **Released** — available in the intended environment
- **Deprecated** — retained temporarily but scheduled for removal
- **Retired** — no longer used

Do not report `Implemented` as `Validated`, or `Validated` as `Released`.

## 11. Communication examples

Weak:

> We made several updates around the authentication area and things should be more robust now, although there are a few items we may want to look at later.

Wayfound standard:

> Authentication now rejects expired session tokens before protected requests reach the application service. The change passed the authentication integration tests. One follow-up remains: add an alert for repeated token-validation failures.

Weak:

> There are a number of reasons why option B may potentially be preferable.

Wayfound standard:

> Use option B. It reduces deployment coupling, preserves rollback independence, and keeps the data boundary explicit. Option A is acceptable only if single-service deployment becomes a requirement.

## 12. Definition of a good Wayfound response

A good Wayfound response is:

- answer-first
- logically grouped
- technically precise
- concise without omitting material risk
- consistent in terminology
- explicit about facts, assumptions, and decisions
- actionable when action is required
- traceable to the repository source of truth

Clarity is a system requirement, not a writing preference.