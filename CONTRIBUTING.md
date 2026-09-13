# Contributing to Wayfound

## Start with the source of truth

Before changing Wayfound:

1. Read `AGENTS.md`.
2. Read the relevant project source files under `docs/`.
3. Identify the requirement, defect, or approved decision that authorizes the change.
4. If the needed behavior is not defined, update the specification before or with the implementation.

## Change workflow

### 1. Define the outcome

State:

- what must change
- why it must change
- which authoritative source defines the expected behavior
- how the result will be validated

### 2. Resolve design decisions

Create an ADR before implementation when the change meets an ADR trigger in `docs/ARCHITECTURE.md`.

Do not let implementation silently make a foundational decision.

### 3. Implement the smallest coherent change

Keep the change focused. Avoid unrelated refactoring unless it is required for correctness or safe delivery.

### 4. Validate

Follow `docs/QUALITY.md` and the applicable acceptance criteria.

Record important manual validation when automated evidence is not practical.

### 5. Reconcile documentation

Update all authoritative files affected by the change. Documentation and implementation must describe the same system.

## Branch and pull-request guidance

Use a short branch name that describes the outcome, for example:

- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `refactor/<short-name>`

Keep pull requests bounded to one coherent outcome when practical.

## Commit guidance

Write commit messages that state the completed change, not the editing activity.

Preferred:

- `Add session expiration validation`
- `Define authentication boundary in ADR-0003`
- `Fix duplicate job processing`

Avoid:

- `updates`
- `changes`
- `misc fixes`
- `work in progress`

## Pull-request content

A pull request must answer:

1. What changed?
2. Why was the change required?
3. Which requirement, defect, or decision authorizes it?
4. How was it validated?
5. What risk remains?
6. Does it require migration, deployment sequencing, or rollback instructions?

Lead with the result. Use the Wayfound communication standard.

## Review standard

Review for:

- requirement correctness
- architecture consistency
- data ownership
- security boundaries
- failure behavior
- operational visibility
- test evidence
- migration and rollback risk
- documentation consistency

Do not approve a change only because the happy path works.

## Completion

A merged change is not automatically a released change. Use the states in `AGENTS.md` and `docs/QUALITY.md` precisely.