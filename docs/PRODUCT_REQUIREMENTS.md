# Wayfound Product Requirements

**Status:** Draft

## Purpose

This file is the authoritative record of approved Wayfound product behavior. It defines what the system must do and how acceptance is determined.

Do not use this file to justify implementation details unless the detail is itself a product constraint.

## 1. Requirement format

Each material requirement should use this structure:

### WF-XXX — Short requirement name

**Status:** Proposed | Approved | Implemented | Validated | Released | Deprecated | Retired

**User or system:** TBD

**Requirement:**

> When **[condition]**, **[actor/system] MUST [behavior]** so that **[observable result]**.

**Rationale:**

TBD

**Acceptance criteria:**

- Given **[precondition]**, when **[action/event]**, then **[observable result]**.
- Given **[failure condition]**, when **[action/event]**, then **[required failure behavior]**.

**Constraints:**

- TBD

**Dependencies:**

- TBD

**Evidence / validation:**

- TBD

## 2. Requirement rules

- Every approved requirement must be testable or objectively reviewable.
- Use one requirement identifier for one stable behavior.
- Do not reuse retired identifiers.
- Do not combine unrelated behaviors into one requirement.
- State failure behavior when failure can affect users, data, security, or operations.
- State permissions and authorization behavior for protected actions.
- State data retention, deletion, or audit behavior when relevant.
- Link architecture decisions when a requirement depends on an ADR.
- Mark unknown behavior `TBD`; do not convert assumptions into requirements without approval.

## 3. Priority model

Use these priorities:

- **P0 — Release critical:** the target release cannot succeed without it.
- **P1 — High:** important to the target outcome; defer only with an explicit tradeoff.
- **P2 — Normal:** valuable but not necessary for the target outcome.
- **P3 — Later:** recorded for future consideration; not committed to the active delivery plan.

Priority does not replace status. A P0 requirement can still be Proposed.

## 4. Functional requirements

No product-specific functional requirements are approved yet.

Add new requirements below this line using the standard format.

---

## 5. Non-functional requirements

Do not invent numeric targets. Establish targets only when the product context supports them.

### 5.1 Security

**TBD** — define authentication, authorization, sensitive-data handling, trust boundaries, audit needs, and security constraints.

### 5.2 Reliability

**TBD** — define availability, recovery, retry, idempotency, data-integrity, and degraded-mode expectations where relevant.

### 5.3 Performance

**TBD** — define user-visible latency, throughput, scale, or resource limits when measured targets are justified.

### 5.4 Accessibility

**TBD** — define required accessibility standard and supported interaction modes for user-facing interfaces.

### 5.5 Privacy and data governance

**TBD** — define data classes, retention, deletion, user control, logging limits, and external processing requirements.

### 5.6 Observability

**TBD** — define required logs, metrics, traces, health checks, alerts, and diagnostic context.

### 5.7 Compatibility

**TBD** — define supported browsers, devices, operating systems, API versions, file formats, or integrations.

### 5.8 Maintainability

At minimum, consequential behavior must be represented in repository documentation and must have a practical validation path.

## 6. Requirement index

| ID | Name | Priority | Status | Validation |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

## 7. Change rule

When implementation changes observable product behavior, update the applicable requirement before or with the code change. When a requirement is intentionally changed, update its acceptance criteria and identify affected implementation and tests.