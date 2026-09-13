# Wayfound Quality Standard

**Status:** Approved baseline

## Purpose

This file defines the minimum evidence required to call Wayfound work complete. Quality is part of implementation, not a final cleanup step.

## 1. Definition of done

A material change is done only when all applicable conditions are true:

- The change traces to an approved requirement, defect, or decision.
- The implementation satisfies the defined acceptance criteria.
- Applicable automated tests pass.
- Important failure paths were reviewed or tested.
- Security effects were reviewed at changed trust boundaries.
- Operational effects are observable where required.
- Data changes have a recovery or migration approach when relevant.
- Deployment and rollback effects are understood.
- User-facing behavior is reviewed for clarity and consistency.
- Affected documentation is updated.
- Remaining risks and follow-up work are recorded.

## 2. Validation layers

Use the smallest set of layers that gives reliable evidence for the change.

### Static validation

Examples:

- formatting
- linting
- type checks
- schema validation
- configuration validation
- dependency policy checks

### Unit validation

Use unit tests for bounded logic with stable inputs and outputs.

### Integration validation

Use integration tests for contracts between components, data stores, external services, or security boundaries.

### End-to-end validation

Use end-to-end tests for critical user or system flows where lower-level tests cannot prove the required outcome.

### Manual validation

Use manual validation for behavior that is visual, exploratory, hardware-dependent, environment-specific, or not practical to automate. Record the procedure and result when it is required for release evidence.

## 3. Risk-based testing

Increase validation depth when a change can affect:

- authentication or authorization
- sensitive data
- persistent data integrity
- destructive operations
- payments or other irreversible external actions
- critical workflows
- shared infrastructure
- migrations
- concurrency
- compatibility
- deployment or rollback

Do not use low code volume as evidence of low risk.

## 4. Security gate

For changes at a trust boundary, verify applicable items:

- authentication is enforced
- authorization is evaluated for the requested action and resource
- untrusted input is validated
- secrets are not exposed in code, logs, errors, or client output
- sensitive data is protected in transit and at rest as required
- errors do not expose unnecessary internal detail
- audit events exist when required
- dependency changes do not introduce an unreviewed material risk

## 5. Reliability gate

For material runtime changes, consider:

- timeout behavior
- retry behavior
- idempotency
- duplicate processing
- partial failure
- dependency outage
- stale data
- resource exhaustion
- restart behavior
- recovery after interrupted work

## 6. Observability gate

A production-relevant failure should provide enough evidence to answer:

1. What failed?
2. Where did it fail?
3. When did it fail?
4. Which request, job, user action, or correlation context was affected when appropriate?
5. What dependency or state contributed?
6. Can an operator distinguish a transient failure from a persistent fault?

Do not log secrets or unnecessary sensitive data to improve diagnostics.

## 7. Release states

Use these states precisely:

- **Implemented** — code or configuration change exists.
- **Validated** — required acceptance criteria and checks passed.
- **Released** — the validated change is available in the intended environment.

A change can be implemented but not validated. A change can be validated but not released.

## 8. Release evidence

For a release, record:

- included change or version
- validation evidence
- deployment target
- known limitations
- migration performed, if any
- rollback method
- post-release verification result

## 9. Defect handling

A defect record should state:

- observed behavior
- expected behavior
- scope or impact
- reproduction evidence when available
- confirmed cause or current hypothesis
- corrective change
- regression validation

Do not describe a hypothesis as a confirmed root cause.

## 10. Quality exceptions

If a required check is intentionally skipped, record:

- the skipped check
- the reason
- the resulting risk
- the approving owner
- the compensating control, if any
- the follow-up action

An exception is a decision, not an invisible shortcut.