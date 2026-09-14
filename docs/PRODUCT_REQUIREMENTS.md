# Wayfound Product Requirements

**Status:** Approved first-version baseline for prototype implementation

## 1. Requirement rules

- Each requirement has one stable identifier.
- `MUST` defines required behavior.
- `SHOULD` defines a strong default that can be changed only with a recorded reason and consequences.
- `MAY` defines optional behavior.
- Acceptance criteria define observable behavior. They do not claim that a test has executed.
- Test evidence and review evidence remain separate from acceptance criteria.
- AI-generated analysis is advisory unless a later requirement explicitly defines a durable AI-review record and its authority boundary.

## 2. Orientation and guidance

### WF-ORI-001 — Current release orientation

**Priority:** P0  
**Status:** Approved

**Requirement:** While a user is in a project workspace, the Wayfound system MUST show the current release, current stage, unresolved items that materially affect progress, and the next recommended action.

**Acceptance criteria:**

- Given a project has an active release, when the owner opens the workspace, then the release and current stage are visible without opening another view.
- Given an unresolved assumption affects the current recommendation, when the owner views the recommendation, then that assumption is visible or directly accessible.

### WF-GDE-001 — Recommended next action

**Priority:** P0  
**Status:** Approved

**Requirement:** When Wayfound recommends a next action, the Wayfound system MUST show the action before its supporting detail and MUST explain why the action matters.

**Acceptance criteria:**

- Given Stage 2 is active for the Borrow Desk scenario, when the overview renders, then “Observe one equipment checkout next” appears as the primary recommendation.
- Given the recommendation is visible, when the owner reads its rationale, then the interface presents the governing outcome before supporting reasons.

### WF-GDE-002 — Visible assumptions

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound system MUST record unanswered material questions as assumptions or open questions instead of presenting them as facts or accepted requirements.

## 3. Journey, ownership, and AI boundary

### WF-JNY-001 — Fifteen-stage journey

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound system MUST represent the complete 15-stage product journey and MUST show which stages are complete, active, upcoming, or reopened.

The canonical stages are:

1. Clarify
2. Validate and compare
3. Establish feasibility
4. Research workflows and UX
5. Develop brand and visual direction
6. Prototype and test
7. Define requirements
8. Choose implementation approach
9. Plan delivery
10. Build
11. Verify
12. Refine quality
13. Prepare pilot and release
14. Launch and establish ownership
15. Monitor and improve

### WF-OWN-001 — Human decision authority

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound system MUST distinguish product-owner decisions from AI-generated recommendations, analysis, and review output.

**Acceptance criteria:**

- Given AI proposes or reviews project work, when that output is shown or stored, then the interface does not present it as owner-approved project direction unless the owner performs the required acceptance action.
- Given AI analysis exists, when the owner reviews project status, then AI analysis is distinguishable from objective verification evidence.

### WF-AI-001 — AI provenance

**Priority:** P0  
**Status:** Approved

**Requirement:** When AI-generated analysis becomes a durable project record, Wayfound MUST retain enough provenance to identify the AI source or tool, the target record or revision, the review purpose, and the generated result.

This requirement defines the product obligation. The durable AI-review implementation remains future Increment 2 scope until a bounded slice is specified and validated.

### WF-AI-002 — AI does not self-approve

**Priority:** P0  
**Status:** Approved

**Requirement:** AI output MUST NOT automatically approve a requirement, accept a decision or artifact, verify a criterion, declare a release ready, or authorize a production-changing action.

## 4. Durable records and status

### WF-REC-001 — Durable project record

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound system MUST keep project scope, decisions, requirements, work, evidence, release records, and maintenance records in the project workspace so the user can resume without relying on chat history.

### WF-REC-002 — Honest status

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound system MUST NOT present implemented, AI-reviewed, or otherwise reviewed work as verified unless the required verification evidence exists and is current.

### WF-REC-003 — Change impact

**Priority:** P1  
**Status:** Approved

**Requirement:** When an accepted decision or artifact changes, the Wayfound system MUST identify known dependent work that needs review and MUST preserve unaffected accepted work.

If the impact is unknown, the system MUST show the impact as unknown until the owner or an approved verification process resolves it.

## 5. Artifact versioning and import

### WF-IMP-001 — Proposed import version

**Priority:** P0  
**Status:** Approved

**Requirement:** When an owner imports a specification file, the Wayfound system MUST create a proposed artifact version without replacing the accepted version.

**Acceptance criteria:**

- Given an accepted specification exists, when the owner imports a valid revision, then the accepted version remains accessible and the imported revision appears as proposed.

### WF-IMP-002 — Failed import preservation

**Priority:** P0  
**Status:** Approved

**Requirement:** If an artifact import fails, then the Wayfound system MUST preserve the accepted artifact and identify the failed import.

**Acceptance criteria:**

- Given an accepted version exists, when an import fails, then the accepted version remains unchanged and the failed attempt shows a recoverable error.

### WF-IMP-003 — Retry history

**Priority:** P0  
**Status:** Approved

**Requirement:** When an owner successfully retries a failed import, the Wayfound system MUST create one proposed version for the successful retry and retain the earlier failure record.

### WF-IMP-004 — Change summary

**Priority:** P1  
**Status:** Approved

**Requirement:** Before the owner accepts an imported revision, the Wayfound system SHOULD show a plain-English summary of material changes.

If this summary is omitted, the project record must contain a reason and an alternative comparison method.

## 6. External human review

Multi-human collaboration inside Wayfound is deferred under ADR-0005.

### WF-HND-001 — External review package

**Priority:** P2  
**Status:** Deferred

**Requirement:** If a future approved scope adds an external human-review package, Wayfound SHOULD produce a bounded package that identifies relevant context, accepted scope, exclusions, decisions, assumptions, constraints, requested outputs, and return instructions without requiring workspace membership.

### WF-HND-002 — Returned external work remains proposed

**Priority:** P2  
**Status:** Deferred

**Requirement:** If external human work is imported in a future approved scope, Wayfound MUST preserve the original return and MUST keep returned changes proposed until the owner reconciles them with accepted scope and decisions.

## 7. Release and care

### WF-REL-001 — Concrete release packet

**Priority:** P1  
**Status:** Approved

**Requirement:** Before a release action is authorized, the Wayfound system MUST identify the exact release version, target, material data effects, known interruption, recovery method, responsible executor when applicable, and unresolved findings that affect the release decision.

### WF-REL-002 — Scoped authorization

**Priority:** P1  
**Status:** Approved

**Requirement:** A release authorization MUST apply only to the reviewed release packet. A material change to the version, target, data operation, or consequences MUST require renewed review.

### WF-CAR-001 — Operating ownership

**Priority:** P1  
**Status:** Approved

**Requirement:** A released project MUST identify operating responsibility and MUST retain maintenance, incident, recovery, and improvement records in the project workspace.

For the single-user first version, the product owner is the default operations owner unless a later approved scope introduces another accountable human role.

## 8. First-version interface requirements

### WF-UI-001 — Responsive workspace

**Priority:** P0  
**Status:** Approved

**Requirement:** The Wayfound first version MUST provide a usable web workspace on phone and desktop layouts.

### WF-UI-002 — Primary navigation

**Priority:** P0  
**Status:** Approved

**Requirement:** The single-user desktop workspace MUST provide direct navigation to Overview, Journey, Work, Records, and Release & Care.

The compact mobile workspace MUST provide direct access to Overview, Journey, Work, and a More destination for the remaining workspace areas.

A Handoffs destination is not required in the active single-user first-version interface.

### WF-UI-003 — Status is not color-only

**Priority:** P0  
**Status:** Approved

**Requirement:** The interface MUST identify important status with text and MUST NOT rely on color alone.

## 9. Deferred capabilities

The following capabilities are outside the active first-version commitment unless a later approved change moves them into scope:

- collaborator accounts, invitations, membership administration, and ownership transfer;
- human work assignment inside Wayfound;
- specialist reviewer accounts, reviewer-code exchange, and assignment-scoped human review;
- manual human handoff/return workflows as a core project surface;
- verified direct specialist-tool connectors;
- automatic CI/CD evidence ingestion;
- automatic repository change analysis;
- scheduling integrations;
- portfolio reporting;
- automatic production-changing actions;
- rich side-by-side document comparison.

A future requirement retains its normative strength only after its feature enters an approved release scope.

## 10. Validation state

The requirements above define expected behavior. They do not claim that all behavior is implemented, reviewed, verified, or released.

Existing validation records for authenticated human specialist-review slices remain valid evidence of those historical implementations. ADR-0005 removes those multi-human workflows from active first-version product scope; it does not rewrite their past validation state.

### WF-UI-004 — Plain-language guidance and progressive disclosure

**Priority:** P0
**Status:** Approved by the project owner's UX instruction

The active single-user workspace MUST lead with the current stage and next useful action. Overview MUST include What we know, What we still need to answer, and Recent changes based on saved records or explicitly labeled guidance. It MUST NOT invent facts, evidence, completed stages, or release readiness.

Creation forms MUST remain closed until requested. Primary copy MUST use common words; canonical metadata and authority detail MUST remain accessible through secondary labels or Details. Navigation MUST separate Overview, Journey, Work, Records, and Release & Care while preserving workspace identity. Simplified copy MUST NOT change authority, confirmation, status, or evidence semantics.
