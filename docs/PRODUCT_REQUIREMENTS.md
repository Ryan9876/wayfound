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

### WF-001 — Capture the user's starting idea

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When a user starts an Interview, Wayfound MUST let the user describe what they want to make, fix, or improve in their own words before requiring structured decisions.

**Rationale:**

The Interview must begin from user intent instead of forcing the user to translate an idea into formal product or technical language.

**Acceptance criteria:**

- Given a new Interview, when the page opens, then the user can enter free-form text describing the idea, problem, or change.
- Given an empty idea, when the user attempts to continue, then Wayfound does not advance.
- Given a non-empty idea, when the user continues, then Wayfound begins the guided decision flow.

**Constraints:**

- The prompt must not assume that the project is a business application.
- The initial slice does not send the text to an external service.

**Evidence / validation:**

- Manual browser review.
- Interview state unit tests where applicable.

### WF-002 — Present one guided decision at a time

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When the Interview needs a material decision, Wayfound MUST present one focused question with understandable choices so that the user can make the decision without navigating a long form.

**Acceptance criteria:**

- The Interview presents one decision question at a time.
- The user can select one option and continue.
- The user can go back and change a previous decision.
- The page shows progress through the current definition pass.

**Evidence / validation:**

- Manual interaction review.
- Unit tests for state and completion behavior.

### WF-003 — Explain recommendations and tradeoffs

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When Wayfound recommends an option, Wayfound MUST identify the recommendation and explain the reason and material tradeoff in plain language so that the user can make an informed choice.

**Acceptance criteria:**

- A recommended option is visually identified when one exists.
- When the recommended option is selected, the rationale and tradeoff are visible.
- The user can select a non-recommended option without being blocked.

**Constraints:**

- Recommendations must not be presented as mandatory unless a governing requirement makes the choice mandatory.

**Evidence / validation:**

- Manual content and interaction review.

### WF-004 — Keep project state visible

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> While a user completes the Interview, Wayfound MUST show the current definition state so that the user can distinguish completed decisions from unresolved work.

**Acceptance criteria:**

- The page shows interview coverage.
- The page shows which current decision areas are defined or open.
- The page shows counts for decisions, assumptions, blockers, and open questions.
- Recent decisions are visible after the user makes them.

**Evidence / validation:**

- Unit tests for derived state.
- Manual browser review.

### WF-005 — Preserve uncertainty explicitly

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When a choice creates an assumption, blocker, or open question, Wayfound MUST represent that state explicitly instead of silently treating the unknown as a fact.

**Acceptance criteria:**

- A dependency choice that assumes normal external access produces an assumption and a blocker in the initial model.
- A choice to defer external connections produces an open question.
- A temporary-assumption choice remains identifiable as an assumption.

**Evidence / validation:**

- Automated unit tests for derived project state.

### WF-006 — Use friendly, broad, precise language

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When Wayfound presents Interview content, Wayfound MUST use plain and friendly language that works for different ages, experience levels, and project types while preserving the intended decision meaning.

**Acceptance criteria:**

- The Interview does not assume the user is building a business application.
- Necessary technical concepts are described in plain language before specialist terms are required.
- Light humor MAY be used when it improves clarity or approachability and does not obscure the decision.
- The tone is not childish, condescending, or dependent on slang.

**Evidence / validation:**

- UX content review against representative project types such as a game, hobby project, school project, internal tool, and technical system.

### WF-007 — End the first definition pass with a usable summary

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> When the current Interview pass has all currently required decisions, Wayfound MUST show a summary and a recommended next action so that the user knows what happens next.

**Acceptance criteria:**

- The summary includes the starting idea and selected decision labels.
- The summary identifies the recommended next action.
- Any derived blocker remains visible at completion.
- The user can return to review and change decisions.

**Evidence / validation:**

- Unit test for completion and summary behavior.
- Manual browser review.


### WF-008 — Select questions adaptively

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When a user starts or continues an Interview, Wayfound MUST select the next required question from the user’s current idea and accepted decisions instead of forcing every user through one fixed question sequence.

**Rationale:**

A useful Interview should spend the user’s attention on decisions that can change the project. A game, study helper, shared family tool, and technical automation system do not need the same questions.

**Acceptance criteria:**

- Given the same idea and accepted answers, Wayfound selects the same next question.
- A game idea can receive a game-specific question without receiving automation or external-dependency questions when those topics are not applicable.
- A learning idea can receive a learning-specific question without receiving a game-specific question when game behavior is not applicable.
- An automation idea can receive a control question.
- An idea that mentions an external connection, API, service, or device can receive an external-dependency question.
- The current local classifier exposes its detected signals as routing hints and does not present them as permanent facts about the project.

**Constraints:**

- The initial adaptive slice MUST remain local and deterministic.
- The initial adaptive slice MUST NOT require an external AI service.
- Keyword or rule-based classification is a bounded routing mechanism, not an authoritative interpretation of user intent.

**Evidence / validation:**

- Automated adaptive model tests.
- Browser review across representative idea types.

### WF-009 — Let answers change what must be asked next

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When an accepted answer creates or removes a material decision, Wayfound MUST recalculate the applicable Interview questions so that later questions reflect the project’s current state.

**Acceptance criteria:**

- Choosing an automation control model that permits action can make failure behavior applicable.
- Choosing a shared or public collaboration model can make privacy behavior applicable when privacy was not otherwise implied by the starting idea.
- Choosing a one-person collaboration model does not by itself force a privacy question.
- Answers that are no longer applicable do not count toward current progress or the completion summary.

**Evidence / validation:**

- Automated applicability tests.
- Browser interaction review.

### WF-010 — Calculate progress from useful required questions

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> While the Interview is active, Wayfound MUST calculate progress and completion from the required questions that currently apply so that the user is not measured against irrelevant work.

**Acceptance criteria:**

- The progress denominator changes when a newly applicable required question is introduced.
- The Interview does not complete while a currently applicable required question is unanswered.
- The Interview can complete when all currently applicable required questions have accepted answers.
- Completion shows only applicable decisions in the current summary.

**Evidence / validation:**

- Automated completion and summary tests.
- Full browser-flow validation.

### WF-011 — Preserve choices during adaptive review

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> When a user goes back or reviews an adaptive Interview, Wayfound MUST preserve accepted choices and restore the applicable question context so that the user can revise a decision without restarting the Interview.

**Acceptance criteria:**

- Going back restores the prior question and its selected option.
- Reviewing a completed Interview returns the user to the applicable decision flow with prior choices intact.
- Changing the starting idea resets prior decision state because the earlier routing context may no longer apply.

**Evidence / validation:**

- Automated history test.
- Browser keyboard and back-navigation review.

## 5. Non-functional requirements

Do not invent numeric targets. Establish targets only when the product context supports them.

### 5.1 Security

The initial Interview slice MUST run without secrets, credentials, protected actions, or external service calls.

Production authentication, authorization, and security boundaries remain `TBD`.

### 5.2 Reliability

The initial Interview slice MUST keep its derived state deterministic for the same idea and selected answers.

Persistence, recovery after browser closure, and multi-device continuity remain `TBD`.

### 5.3 Performance

No numeric target is approved for the initial slice.

### 5.4 Accessibility

The initial Interview slice MUST support keyboard navigation for interactive controls and MUST expose selection state through standard accessible control semantics where practical for the static prototype.

The production accessibility standard remains `TBD` and must be selected before production release.

### 5.5 Privacy and data governance

The initial Interview slice MUST NOT send or persist Interview content outside the current browser session.

If a future hosted version stores user content or sends it to external AI services, privacy, retention, deletion, consent, and age-related controls MUST be defined before that behavior is implemented.

### 5.6 Observability

Production observability remains `TBD`. The static prototype has no production runtime service.

### 5.7 Compatibility

The prototype uses standards-based HTML, CSS, and JavaScript. Formal supported-browser targets remain `TBD`.

### 5.8 Maintainability

Consequential Interview behavior must be represented in repository documentation and must have a practical validation path.

The Interview decision model SHOULD remain separate from rendering logic so question-routing rules or a future approved semantic classifier can evolve without requiring a complete UI rewrite.

## 6. Requirement index

| ID | Name | Priority | Status | Validation |
| --- | --- | --- | --- | --- |
| WF-001 | Capture the user's starting idea | P0 | Validated | Manual + state tests |
| WF-002 | Present one guided decision at a time | P0 | Validated | Manual + state tests |
| WF-003 | Explain recommendations and tradeoffs | P0 | Validated | Manual review |
| WF-004 | Keep project state visible | P1 | Validated | Manual + state tests |
| WF-005 | Preserve uncertainty explicitly | P0 | Validated | Automated state tests |
| WF-006 | Use friendly, broad, precise language | P0 | Validated | UX content review |
| WF-007 | End the first definition pass with a usable summary | P1 | Validated | Manual + state tests |
| WF-008 | Select questions adaptively | P0 | Validated | Adaptive model + browser tests |
| WF-009 | Let answers change what must be asked next | P0 | Validated | Applicability + browser tests |
| WF-010 | Calculate progress from useful required questions | P1 | Validated | Completion + browser tests |
| WF-011 | Preserve choices during adaptive review | P1 | Validated | History + browser tests |

## 7. Validation record

**2026-09-17 — Initial Interview slice**

- `node --test tests/*.test.mjs`: 6 tests passed.
- JavaScript syntax checks passed for `app/interview.js` and `app/interview-model.js`.
- Headless Chromium completed the full six-decision Interview flow.
- Keyboard selection, back-navigation, non-recommended choices, blocker visibility, completion summary, and review flow were exercised.
- Responsive review passed at 1440, 980, 680, 390, and 320 pixel viewport widths with no horizontal overflow.
- The completion summary includes the original idea and selected decision labels.
- Content smoke checks used game, school, family, hobby, and technical-system ideas.

The current slice is validated for its defined prototype scope. It is not released as a production service.


**2026-09-17 — Adaptive Interview slice**

- `node --test tests/*.test.mjs`: 12 tests passed.
- JavaScript syntax checks passed for `app/interview.js` and `app/interview-model.js`.
- Browser validation confirmed different applicable question sets for game, learning, family/shared, and technical automation ideas.
- Browser validation confirmed answer-driven applicability: control choices can add failure questions and sharing choices can add privacy questions.
- A `not sure` answer creates a visible open question without creating a blocker by itself.
- Full adaptive completion reached 100% using only the required questions applicable to the idea and accepted answers.
- Keyboard selection, back-navigation, original-idea traceability, and responsive layouts down to 320 px were reviewed.
- No external AI, persistence, account, or network dependency was introduced.

## 8. Change rule

When implementation changes observable product behavior, update the applicable requirement before or with the code change. When a requirement is intentionally changed, update its acceptance criteria and identify affected implementation and tests.
