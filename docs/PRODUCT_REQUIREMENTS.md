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

### WF-012 — Project Interview state into structured records

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When the current Interview contains accepted choices or derived uncertainty, Wayfound MUST project the applicable state into structured records so that later work can reference the origin and type of each item.

**Acceptance criteria:**

- An accepted applicable choice produces a decision record with a deterministic identifier, status, source, question identifier, selected choice, and tradeoff text when available.
- A `not sure` answer produces an open-question record instead of an accepted decision record for that question.
- Derived assumptions and blockers produce separate assumption and blocker records.
- Answers that are no longer applicable to the current idea do not produce current records.
- Recomputing records from the same Interview state produces the same identifiers and content.

**Constraints:**

- The initial record projection MUST remain derived from the in-memory Interview state.
- The record projection MUST NOT become a second authoritative data source.
- The initial slice MUST NOT persist records outside the current browser session.

**Evidence / validation:**

- Automated record-projection tests.
- Browser review of decision, assumption, blocker, and open-question records.

### WF-013 — Show current Interview records in Wayfound Records

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> When a user opens Records, Wayfound MUST show the structured records derived from the current Interview session so that the user can see what was decided, what is assumed, what is blocked, and what remains open.

**Acceptance criteria:**

- Records shows a clear empty state before the Interview produces records.
- Records shows record type, identifier, title, statement, source, and supporting detail when available.
- Records shows counts for decisions, assumptions, blockers, and open questions.
- A user can switch between Interview and Records without losing the current in-memory Interview state.
- Records is reachable on desktop and mobile layouts.
- The Records view uses friendly labels while preserving stable record identifiers for traceability.

**Evidence / validation:**

- Browser interaction review at desktop and mobile widths.
- Automated model tests for the record projection consumed by the page.


### WF-014 — Derive draft build artifacts from Records

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When the current Records contain accepted decisions or unresolved state, Wayfound MUST derive draft build artifacts that preserve source-record traceability without treating the generated artifacts as approved project truth.

**Acceptance criteria:**

- A non-empty starting idea produces a draft build brief.
- Accepted decisions produce draft Journey steps with source record identifiers.
- Only mapped decisions that describe expected product or system behavior produce draft requirement candidates.
- Outcome and audience decisions can inform the brief and Journey without automatically becoming requirements.
- Assumptions, blockers, and open questions produce draft follow-up work rather than requirements.
- An unresolved `not sure` answer does not become an approved or draft requirement merely because it exists in Records.
- Every generated Journey step, requirement candidate, and work item carries the source record identifier that produced it.
- All generated artifacts remain `draft`; generation MUST NOT change the status of a Record or approve an artifact.

**Constraints:**

- Draft artifacts are deterministic projections of current session Records.
- Draft artifacts MUST NOT become a second authoritative source.
- The initial slice MUST NOT persist, publish, approve, or execute generated artifacts.

**Evidence / validation:**

- Automated artifact-projection tests.
- Browser review of representative completed and partial Interviews.

### WF-015 — Show draft outputs clearly in Records

**Status:** Validated

**Priority:** P1

**User or system:** User

**Requirement:**

> When draft artifacts can be derived from the current Records, Wayfound MUST show them with an unmistakable draft boundary so that the user can inspect possible next artifacts without confusing them with approved requirements or committed work.

**Acceptance criteria:**

- Records shows a visible `Draft only` label for generated outputs.
- The preview separates the build brief, Journey, draft requirements, and draft work.
- Generated requirement and work items show their source record identifiers.
- A partial Interview does not invent unavailable outcome, audience, requirement, or work content.
- The draft preview remains usable on desktop and mobile layouts.

**Evidence / validation:**

- Browser interaction and responsive review.
- Artifact-model tests for empty, partial, and resolved record sets.

### WF-016 — Review actionable draft artifacts without implying approval

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When Wayfound shows actionable draft requirements or draft follow-up work, Wayfound MUST let the user explicitly leave the item as Draft, mark it Proposed for project-owner review, or Set it aside without representing any of those actions as formal approval.

**Rationale:**

Generated drafts need an intentional human disposition before they can become authoritative project state. In the current session-only prototype there is no identity or approval authority, so `Proposed` is the strongest safe promotion state.

**Acceptance criteria:**

- Draft requirements and draft work expose `Propose` and `Set aside` actions.
- Proposed items are visibly labeled `Proposed` and the UI explains that Proposed means carry forward for project-owner review, not Approved.
- Set-aside items are visibly labeled `Set aside`.
- Proposed and Set-aside items can be returned to Draft with Undo.
- The build brief and Journey preview are not reviewable promotion targets in this slice.
- The review model does not accept an `approved` disposition.
- If a reviewable artifact disappears, its saved review disposition is discarded.
- If a reviewable artifact keeps the same identifier but its material content or source-record signature changes, its prior Proposed or Set-aside state is discarded and it returns to Draft.
- Review state remains session-only and does not change the source Record or generated Draft artifact status.

**Constraints:**

- This slice MUST NOT create formal approval authority.
- This slice MUST NOT persist review state outside the current browser session.
- Formal approval requires a later explicit design for project authority, identity, persistence, and auditability.

**Evidence / validation:**

- Seven automated artifact-review model tests pass, including invalid-approval rejection and stale-content reset.
- Chromium browser validation passed for Propose, Set aside, Undo, explicit non-approval language, stale-content reset, and responsive behavior at 1440 px and 390 px with no horizontal overflow.

### WF-017 — Map authenticated users to stable Wayfound Actors

**Status:** Approved

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When a hosted project action requires identity, Wayfound MUST authenticate the user through the configured identity provider and map that external identity to one stable internal Wayfound Actor before project authority is evaluated.

**Acceptance criteria:**

- An unauthenticated request for a protected project action is rejected.
- The same Clerk subject maps to the same Wayfound Actor across requests.
- Wayfound uses the internal Actor identifier for project membership and transition metadata.
- Clerk roles or organization roles do not replace Wayfound project authorization.
- The initial mapping stores only the external subject and provider information required for identity mapping; it does not copy profile free text into the project store.

**Constraints:**

- Clerk is the accepted M1 authentication provider.
- M2 supports human Actors only for interactive project actions.
- Formal age, guardian, and consent behavior for hosted younger users remains a release gate and is not invented by this requirement.

**Evidence / validation:**

- Authentication/Actor mapping integration tests.
- Unauthorized-request tests.

### WF-018 — Create and reopen a private durable project through server authority

**Status:** Approved

**Priority:** P0

**User or system:** User

**Requirement:**

> When an authenticated user creates a project, Wayfound MUST create the project through the authoritative server command path, make the creator an owner, keep the project private by default, and persist enough state to reopen the project after browser or session loss.

**Acceptance criteria:**

- Create Project requires an authenticated Wayfound Actor.
- The server creates an application-owned Project identifier and a project-owner membership in one authoritative transaction.
- The project title and starting idea are durable project state.
- A later authenticated request by the project owner can reopen the project after a new browser session.
- A nonmember cannot read the project.
- Repeating the same create command with the same Actor, operation, and idempotency key returns the original command result rather than creating a second project.
- The browser does not write project rows directly.

**Constraints:**

- The first hosted project is private by default.
- M2 does not add public sharing or invitations.
- Real hosted user content MUST NOT be released until the applicable retention, deletion, age, and consent requirements are approved.

**Evidence / validation:**

- Project command integration tests against PostgreSQL.
- Browser/session reopen validation in a non-production environment.

### WF-019 — Persist accepted answers as immutable revisions with traceable Records

**Status:** Approved

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When an authenticated project member accepts a material Interview answer, Wayfound MUST persist a new immutable Answer Revision and its current trace Record through one server-side transaction so history and source traceability are preserved.

**Acceptance criteria:**

- An accepted answer creates a new immutable Answer Revision instead of overwriting an earlier revision.
- The current logical Answer points to exactly one current Answer Revision.
- The same transaction creates or advances the corresponding Record Revision and links it to the exact Answer Revision that produced it.
- The Project version advances with the accepted change.
- A command based on a stale expected Project version is rejected as a conflict instead of silently overwriting current state.
- Repeating the same accepted-answer command with the same Actor, operation, and idempotency key returns the original command result without duplicating revisions.
- Transition metadata does not duplicate unrestricted project free text.

**Constraints:**

- M2 proves one decision/Record path; it does not yet migrate every prototype question into hosted production behavior.
- The current validated prototype remains the UX reference while the production persistence path is introduced incrementally.

**Evidence / validation:**

- Domain tests for optimistic concurrency and semantic identifiers.
- PostgreSQL integration tests for atomic revision, Record, trace-link, and transition writes.

### WF-020 — Materialize a proposal against exact current source revisions

**Status:** Approved

**Priority:** P0

**User or system:** User

**Requirement:**

> When an authorized user chooses Propose for a draft requirement or work item, Wayfound MUST materialize the exact proposed content and exact current source Record Revisions without treating the proposal as Approved.

**Acceptance criteria:**

- Rendering a generated candidate does not persist an Artifact by itself.
- Propose requires the `artifact.propose` project capability.
- Propose snapshots the title, statement, content hash, and immutable Artifact Revision.
- The proposal stores Trace Links to the exact current Record Revisions supplied as sources.
- If any supplied source revision is no longer current, the command is rejected and the user must rebuild or review the draft.
- The Project version advances transactionally with the proposal.
- The resulting lifecycle state is `proposed`.
- M2 exposes no command or database lifecycle state that can turn the proposal into `approved`.

**Constraints:**

- Formal approval is outside M2 and requires a separately approved product requirement.
- Proposal persistence does not mutate the source Records.

**Evidence / validation:**

- Domain tests for exact source-revision checks and content hashing.
- PostgreSQL integration tests for Artifact Revision, Trace Link, transition, and Project-version atomicity.

### WF-021 — Enforce Wayfound project authorization for project data and commands

**Status:** Approved

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When an Actor reads or changes durable project state, Wayfound MUST evaluate project membership and Wayfound-owned capabilities at the server authority boundary before returning project data or committing the command.

**Acceptance criteria:**

- The project creator receives the M2 `owner` role.
- The M2 owner role can read the project, change accepted project state, and propose an artifact.
- An Actor without project membership cannot read or change the project.
- Authorization uses Wayfound membership/capability records rather than Clerk organization or role data as project truth.
- AI or service Actors do not receive interactive project authority in M2.
- The browser cannot bypass authorization by submitting a lifecycle value directly.

**Constraints:**

- M2 defines only the owner role required by the first vertical slice.
- Additional roles and formal approval authority require later approved requirements.

**Evidence / validation:**

- Capability unit tests.
- Server-route authorization tests.
- PostgreSQL integration tests using member and nonmember Actors.

### WF-022 — Keep the first hosted-data slice isolated and content-minimal

**Status:** Approved

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When Wayfound runs the M2 hosted-data slice, Wayfound MUST keep development, preview, and production data boundaries explicit and MUST avoid sending project content to external AI or ordinary telemetry so incomplete production policy cannot silently become data practice.

**Acceptance criteria:**

- The configured Wayfound data environment is explicitly `development`, `preview`, or `production`.
- A Vercel environment cannot start durable data operations when its environment label conflicts with the configured Wayfound data environment.
- Preview and development configuration do not use production project credentials by design.
- Ordinary command telemetry records identifiers, operation/result metadata, and error codes without copying project titles, starting ideas, answers, or artifact statements.
- M2 makes no external AI/model call with project content.
- Production release with real hosted user content remains blocked until retention, deletion, consent, and age-related requirements for the intended users are approved.

**Constraints:**

- Synthetic or development-only project content MAY be used to validate M2 before the hosted-data policy is approved.
- This requirement does not define numeric retention windows, age thresholds, guardian behavior, or legal policy.

**Evidence / validation:**

- Environment-isolation unit tests.
- Configuration review for Vercel environment separation.
- Logging/content review.
- Release-gate review before real hosted user data is accepted.

## 5. Non-functional requirements

Do not invent numeric targets. Establish targets only when the product context supports them.

### 5.1 Security

The initial Interview slice MUST run without secrets, credentials, protected actions, or external service calls.

Production authentication and authority boundaries are defined by ADR-0003, ADR-0005, and ADR-0007. M2 MUST enforce those boundaries through WF-017 and WF-021 before durable project commands are accepted.

### 5.2 Reliability

The initial Interview slice MUST keep its derived state deterministic for the same idea and selected answers.

M2 durable project persistence MUST survive browser/session loss for the bounded project state defined by WF-018 through WF-020. Stale consequential writes MUST fail rather than use silent last-write-wins behavior.

### 5.3 Performance

No numeric target is approved for the initial slice.

### 5.4 Accessibility

The initial Interview slice MUST support keyboard navigation for interactive controls and MUST expose selection state through standard accessible control semantics where practical for the static prototype.

The production accessibility standard remains `TBD` and must be selected before production release.

### 5.5 Privacy and data governance

The initial Interview slice MUST NOT send or persist Interview content outside the current browser session.

M2 MAY use synthetic/development content to validate hosted persistence. Production release with real hosted user content remains blocked until retention, deletion, consent, and age-related requirements for the intended users are approved. External AI processing of project content is outside M2.

### 5.6 Observability

M2 MUST produce content-minimal structured command telemetry sufficient to diagnose command, identity, database, and migration failures without copying unrestricted project text. The observability vendor remains `TBD`.

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
| WF-012 | Project Interview state into structured records | P0 | Validated | Record-model + browser tests |
| WF-013 | Show current Interview records in Wayfound Records | P1 | Validated | Browser + record-model tests |
| WF-014 | Derive draft build artifacts from Records | P0 | Validated | Artifact-model + browser tests |
| WF-015 | Show draft outputs clearly in Records | P1 | Validated | Browser + artifact-model tests |
| WF-016 | Review actionable draft artifacts without implying approval | P0 | Validated | Review-state model + Chromium interaction tests |

| WF-017 | Map authenticated users to stable Wayfound Actors | P0 | Approved | Auth/Actor integration tests |
| WF-018 | Create and reopen a private durable project through server authority | P0 | Approved | Project/PostgreSQL integration + browser reopen |
| WF-019 | Persist accepted answers as immutable revisions with traceable Records | P0 | Approved | Domain + PostgreSQL integration tests |
| WF-020 | Materialize a proposal against exact current source revisions | P0 | Approved | Domain + PostgreSQL integration tests |
| WF-021 | Enforce Wayfound project authorization for project data and commands | P0 | Approved | Capability + route/integration tests |
| WF-022 | Keep the first hosted-data slice isolated and content-minimal | P0 | Approved | Environment/config/logging/release-gate review |

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

**2026-09-17 — Interview Records slice**

- `node --test tests/*.test.mjs`: 17 tests passed.
- JavaScript syntax checks passed for `app/interview.js` and `app/interview-model.js`.
- Automated tests verified deterministic decision identifiers, open-question handling, derived assumption/blocker records, and exclusion of non-applicable answers.
- Browser validation confirmed the Records empty state, Interview-to-Records navigation, preserved session state, and record rendering after a completed adaptive Interview.
- The validated technical scenario produced seven decision records, two assumption records, one blocker record, and zero open-question records.
- Desktop and 390 px mobile layouts were reviewed with no horizontal overflow.
- Mobile navigation was added so Interview and Records remain reachable after the desktop sidebar collapses.
- Records remain session-only and derived from Interview state; no persistence or second data authority was introduced.


**2026-09-17 — Draft artifact preview slice**

- The complete model suite reached 23 passing tests before modularization; the isolated artifact module revalidation adds six passing artifact-projection tests with the adaptive Interview/Records core unchanged.
- JavaScript syntax checks pass for the artifact model and renderer modules.
- Browser review of the validated implementation showed a visible `Draft only` boundary, a first build brief, Journey steps, draft requirement candidates, and draft follow-up work with source record identifiers.
- Representative partial state did not manufacture requirement candidates from outcome/audience-only decisions or unresolved `not sure` answers.
- Desktop and 390 px mobile layouts were reviewed with no horizontal overflow.
- Generated artifacts remain session-only projections. No persistence, approval, publishing, code generation, external AI, or execution behavior was introduced.

**2026-09-17 — Artifact review slice (implementation evidence)**

- Seven artifact-review model tests pass.
- The model supports Draft, Proposed, and Set aside, and rejects `approved` as an invalid disposition.
- Proposed artifacts are returned as separate proposed views while the underlying generated artifact remains `draft`.
- Dispositions are reconciled away when artifacts disappear.
- A content/source signature change resets prior Proposed or Set-aside state to Draft even when the artifact identifier is unchanged.
- JavaScript syntax checks pass for the review model and renderer.
- Browser interaction validation passed in headless Chromium using an isolated injected review harness after local URL navigation was blocked by environment policy. Propose, Set aside, Undo, explicit non-approval language, and same-ID content-change reset all passed.
- Responsive validation passed at 1440 px and 390 px with no horizontal overflow; the review summary and artifact grid stack correctly at mobile width.
- The browser harness exercised the exact review-state and review-rendering behavior without deploying Wayfound or adding a network/data boundary.

## 8. Change rule

When implementation changes observable product behavior, update the applicable requirement before or with the code change. When a requirement is intentionally changed, update its acceptance criteria and identify affected implementation and tests.
