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

### WF-017 — Reuse a stable local Wayfound Actor without requiring sign-in

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When Wayfound runs in default local mode, Wayfound MUST create or reuse one stable local human Actor without requiring an external account so that local project authority and transition history have a durable human identity.

**Acceptance criteria:**

- Local mode starts without Clerk or another external identity provider.
- Repeated requests and database reopen reuse the same local Wayfound Actor.
- Wayfound uses the internal Actor identifier for project membership and transition metadata.
- The local Actor is human and does not grant AI/service Actors project authority.
- Enabling a future hosted identity adapter does not change Wayfound-owned project authorization rules.

**Constraints:**

- M2 is single-user local mode by default.
- Hosted identity is optional and outside the M2 merge gate.
- Formal hosted age, guardian, and consent behavior remains a later release gate.

**Evidence / validation:**

- Local Actor persistence/reopen integration tests.
- Optional hosted Actor mapping compatibility tests may remain non-blocking.

### WF-018 — Create and reopen a private durable local project through server authority

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When the local user creates a project, Wayfound MUST create the project through the local authoritative server command path, make the local Actor an owner, keep the project private on the computer by default, and persist enough state to reopen the project after process/database reopen.

**Acceptance criteria:**

- Create Project requires a resolved Wayfound Actor, which defaults to the stable local Actor.
- The local server creates an application-owned Project identifier and owner membership in one transaction.
- Project title and starting idea are durable local project state.
- The owner can reopen the project after the database/server is closed and reopened.
- Repeating the same create command with the same Actor, operation, and idempotency key returns the original result rather than creating a second project.
- The browser does not write project rows directly.
- No Clerk, Neon, Vercel, or external AI credential is required for this behavior.

**Constraints:**

- M2 does not add public sharing, invitations, or synchronization.
- The default database remains local/private unless the user deliberately enables a future hosted/sync feature.

**Evidence / validation:**

- SQLite integration and reopen tests.
- Local browser flow when the UI gate is added.

### WF-019 — Persist accepted answers as immutable local revisions with traceable Records

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When the local project owner accepts a material Interview answer, Wayfound MUST persist a new immutable Answer Revision and its current trace Record through one local server-side transaction so history and exact source traceability are preserved.

**Acceptance criteria:**

- An accepted answer creates a new immutable Answer Revision instead of overwriting an earlier revision.
- The current logical Answer points to exactly one current Answer Revision.
- The same transaction creates or advances the corresponding Record Revision and links it to the exact Answer Revision that produced it.
- The Project version advances with the accepted change.
- A command based on a stale expected Project version is rejected as a conflict instead of silently overwriting current state.
- Repeating the same command with the same Actor, operation, and idempotency key returns the original result without duplicate revisions.
- Transition metadata does not duplicate unrestricted project free text.

**Constraints:**

- M2 proves one decision/Record path before migrating the complete validated Interview experience.
- The validated static prototype remains the UX reference during incremental migration.

**Evidence / validation:**

- Domain tests for concurrency and semantic identifiers.
- SQLite integration tests for revision, Record, trace-link, transition, and reopen behavior.

### WF-020 — Materialize a proposal against exact current local source revisions

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When the local project owner chooses Propose for a draft requirement or work item, Wayfound MUST materialize the exact proposed content and exact current source Record Revisions without treating the proposal as Approved.

**Acceptance criteria:**

- Rendering a generated candidate does not persist an Artifact by itself.
- Propose requires the `artifact.propose` project capability.
- Propose snapshots title, statement, content hash, and immutable Artifact Revision.
- Trace Links target the exact current Record Revisions supplied as sources.
- If any supplied source revision is no longer current, the command is rejected.
- The Project version advances transactionally with the proposal.
- The resulting lifecycle state is `proposed`.
- M2 exposes no command or local database lifecycle value that can turn the proposal into `approved`.

**Constraints:**

- Formal approval is outside M2 and requires a separately approved requirement.
- Proposal persistence does not mutate source Records.

**Evidence / validation:**

- Domain tests for exact source-revision checks and content hashing.
- SQLite integration tests for Artifact Revision, Trace Link, transition, lifecycle constraint, and Project-version atomicity.

### WF-021 — Enforce Wayfound project authorization in local and optional hosted modes

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When an Actor reads or changes durable project state, Wayfound MUST evaluate Wayfound-owned project membership and capabilities at the server authority boundary before returning project data or committing the command, regardless of whether identity/persistence are local or hosted adapters.

**Acceptance criteria:**

- The project creator receives the M2 `owner` role.
- The M2 owner can read project state, change accepted state, and propose an Artifact.
- An Actor without project membership cannot read or change the project.
- Authorization uses Wayfound membership/capability records rather than provider roles as project truth.
- AI/service Actors do not receive interactive project authority in M2.
- The browser cannot bypass authorization by submitting a lifecycle value directly.

**Constraints:**

- M2 defines only the owner role required by the first durable slice.
- Additional roles and formal approval authority require later approved requirements.

**Evidence / validation:**

- Capability tests.
- SQLite integration tests using member/nonmember Actors where applicable.
- Optional hosted adapter tests remain compatibility evidence, not local M2 prerequisites.

### WF-022 — Keep project content local by default and make AI egress explicit

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When Wayfound runs locally, Wayfound MUST keep project content on the local computer by default, keep AI disabled unless configured, support local model endpoints without external-content permission, and fail closed before sending project content to a non-loopback AI endpoint unless external AI processing has been deliberately enabled.

**Acceptance criteria:**

- AI is disabled by default.
- Ollama resolves to a loopback OpenAI-compatible endpoint by default.
- LM Studio resolves to a loopback OpenAI-compatible endpoint by default.
- A loopback OpenAI-compatible endpoint does not require external-AI opt-in.
- A non-loopback AI endpoint is rejected unless explicit external-AI permission is enabled.
- An external OpenAI-compatible provider requires its configured credential without placing the credential in project records, browser state, Git, or ordinary telemetry.
- AI/model output remains non-authoritative and cannot directly approve or mutate project state.
- Ordinary command telemetry excludes project titles, starting ideas, answers, and artifact statements.
- Hosted persistence/identity/deployment are optional and do not become requirements for local use.

**Constraints:**

- M2 does not require an LLM to use core project functions.
- Provider-specific adapters beyond the initial local/OpenAI-compatible boundary may be added later.
- A future user-facing provider/settings screen is separate work; M2 may configure providers through local environment/settings plumbing.

**Evidence / validation:**

- AI provider-boundary tests.
- Logging/content-minimization tests.
- Next.js build and local project tests with no hosted credentials.

### WF-023 — Preserve validated adaptive Interview semantics in the durable runtime

**Status:** Validated

**Priority:** P0

**User or system:** Wayfound

**Requirement:**

> When a local durable project runs the Interview, Wayfound MUST use the validated adaptive Interview question, applicability, recommendation, tradeoff, progress, and completion semantics rather than introducing a separate durable-mode question flow.

**Acceptance criteria:**

- The durable runtime uses the same question identifiers, option identifiers, applicability rules, priorities, recommendations, help text, rationale, and tradeoffs as the validated Interview model.
- The same starting idea and current answer set produce the same applicable required questions and next unanswered question as the validated model.
- An answer can make later questions appear or disappear using the existing applicability rules.
- `I am not sure yet` remains a valid unresolved answer and does not become a blocker or accepted decision merely because it is durable.
- Progress and completion use only currently applicable required questions.
- M2.1 does not introduce an LLM requirement or a second semantic classifier.

**Constraints:**

- The validated static Interview remains the behavior reference during this migration.
- M2.1 MUST NOT silently rewrite the question bank or recommendation policy.
- Full durable projection of assumptions, blockers, open questions, and downstream build artifacts remains separate follow-on work unless required to preserve current-answer semantics.

**Evidence / validation:**

- Automated parity check against the validated Interview model source.
- Durable-model tests across representative general, game, learning, collaboration, integration, automation, and technical ideas.
- Local Chromium flow confirms adaptive question changes in the durable project UI.

### WF-024 — Persist and restore the current adaptive Interview answer state

**Status:** Validated

**Priority:** P0

**User or system:** User

**Requirement:**

> When the local project owner accepts or revises an Interview choice, Wayfound MUST persist the current answer as an immutable local revision and reconstruct the adaptive Interview from those current revisions after refresh, navigation, or database/process reopen.

**Acceptance criteria:**

- Saving an Interview choice uses the authoritative local server command path and the current Project version.
- The server validates that the question is currently applicable and that the option belongs to that question before persistence.
- Accepted changes create immutable Answer Revisions and advance Project version through the existing M2 transaction boundary.
- Revising an already answered question creates a later Answer Revision instead of overwriting history.
- Reopening the project reconstructs current answers from persisted current Answer Revisions rather than browser-only state.
- The reconstructed Interview resumes at the first currently applicable unanswered required question, or shows completion when all currently applicable required questions are answered.
- Review/back interaction preserves already persisted selections and allows a revised choice to be saved as a new revision.
- A stale browser version is rejected instead of silently overwriting a newer answer.
- `not-sure` persists as unresolved Interview state and MUST NOT be materialized as an accepted decision Record in M2.1.

**Constraints:**

- M2.1 remains local-first and requires no account, hosted database, or model provider.
- Changing the starting idea is not added in this slice; when idea editing is introduced it must explicitly reconcile applicability and prior answers.
- Full durable Records parity, including derived assumptions/blockers/open questions, is a subsequent migration slice.

**Evidence / validation:**

- SQLite integration tests for answer revision/reopen/stale-write behavior.
- Browser refresh/reopen test for persisted selected choices and adaptive resume.
- Browser review/edit test proving a changed choice creates the new current state without losing prior revision history.

## 5. Non-functional requirements

Do not invent numeric targets. Establish targets only when the product context supports them.

### 5.1 Security

The initial Interview slice MUST run without secrets, credentials, protected actions, or external service calls.

The durable runtime authority boundaries are defined by ADR-0003, ADR-0005, and ADR-0009. M2 MUST enforce Wayfound-owned Actor/project authority before durable project commands are accepted. Local operation MUST NOT require an external identity provider.

### 5.2 Reliability

The initial Interview slice MUST keep its derived state deterministic for the same idea and selected answers.

M2 local durable persistence MUST survive database/process reopen for the bounded project state defined by WF-018 through WF-020. Stale consequential writes MUST fail rather than use silent last-write-wins behavior.

### 5.3 Performance

No numeric target is approved for the initial slice.

### 5.4 Accessibility

The initial Interview slice MUST support keyboard navigation for interactive controls and MUST expose selection state through standard accessible control semantics where practical for the static prototype.

The durable accessibility standard remains `TBD` and must be selected before a broad release.

### 5.5 Privacy and data governance

The initial Interview slice MUST NOT send or persist Interview content outside the current browser session.

M2 durable project content is local by default. AI is optional. Project content MUST NOT be sent to a non-loopback AI endpoint unless external AI processing is deliberately enabled for that configuration/feature. Hosted release with real user content remains separately gated by retention, deletion, consent, and age-related requirements.

### 5.6 Observability

M2 MUST produce content-minimal structured command telemetry sufficient to diagnose command, local persistence, optional identity-adapter, and AI-adapter failures without copying unrestricted project text. Local operation MUST NOT require an external observability service.

### 5.7 Compatibility

The prototype uses standards-based HTML, CSS, and JavaScript. Formal supported-browser and desktop-packaging targets remain `TBD`.

### 5.8 Maintainability

Consequential Interview behavior must be represented in repository documentation and must have a practical validation path.

The Interview decision model SHOULD remain separate from rendering logic so question-routing rules or a future approved semantic classifier can evolve without requiring a complete UI rewrite.

Local and hosted adapters SHOULD share the same domain-rule tests/contracts so provider differences do not redefine project semantics.

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

| WF-017 | Reuse a stable local Wayfound Actor without requiring sign-in | P0 | Validated | Local Actor persistence/reopen tests |
| WF-018 | Create and reopen a private durable local project through server authority | P0 | Validated | SQLite integration + reopen tests |
| WF-019 | Persist accepted answers as immutable local revisions with traceable Records | P0 | Validated | Domain + SQLite integration tests |
| WF-020 | Materialize a proposal against exact current local source revisions | P0 | Validated | Domain + SQLite integration tests |
| WF-021 | Enforce Wayfound project authorization in local and optional hosted modes | P0 | Validated | Capability + adapter integration tests |
| WF-022 | Keep project content local by default and make AI egress explicit | P0 | Validated | AI boundary + logging + no-cloud build tests |
| WF-023 | Preserve validated adaptive Interview semantics in the durable runtime | P0 | Validated | Model parity + adaptive durable tests |
| WF-024 | Persist and restore the current adaptive Interview answer state | P0 | Validated | SQLite revision/reopen + Chromium tests |

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

**2026-09-17 — M2 local-first durable project slice**

- GitHub Actions M2 local-first CI run #66 passed on commit `17148a0badef8a2dda0722f0e3b6857eaa4e3782`.
- Sixteen domain, authorization, telemetry, concurrency, traceability, environment, and AI-provider boundary tests passed.
- Two local SQLite integration tests passed, including stable local Actor reuse, project/database reopen, command idempotency, immutable Answer/Record revisions, exact trace links, proposal materialization, stale-source rejection, stale-write protection, and database rejection of an `approved` Artifact lifecycle value.
- TypeScript checking and the optimized Next.js production build passed with local identity, local persistence, AI disabled, and no Clerk, Neon, Vercel, or external-model credentials.
- Playwright Chromium passed the local browser flow: create project, save a decision, materialize an exact-source Proposed requirement, navigate away and reopen the durable project, submit an intentionally stale command and receive HTTP 409 `CONFLICT`, verify the rejected command did not mutate current state, and confirm no horizontal overflow at 390 px.
- The separate optional PostgreSQL compatibility job passed migration, integration, schema-presence, rollback, and schema-removal checks. It remains compatibility evidence rather than a dependency of local M2.
- M2 does not introduce formal Artifact approval, hosted synchronization, public sharing, or external AI by default.


**2026-09-17 — M2.1 Durable Adaptive Interview**

- GitHub Actions M2 local-first CI run #79 passed on the M2.1 branch after the request-context fix.
- The durable runtime Interview model is byte-for-byte identical to the validated `app/interview-model.js` source.
- Seventeen model/domain/authorization/telemetry/AI-boundary tests passed, including the model parity gate.
- Four local SQLite integration tests passed, including adaptive applicability/option rejection, immutable Answer Revision history, database reopen, `not-sure` unresolved projection, and stale-write rejection.
- TypeScript checking and the optimized Next.js production build passed without hosted credentials.
- Playwright Chromium passed the durable adaptive flow: create a puzzle-game project, answer the adaptive Interview, reach the game-specific question, refresh, use Back with the persisted selection restored, revise the answer to create revision 2, save `not-sure` as an open question, reject a stale write with HTTP 409, and retain authoritative state.
- The 390 px browser gate passed with no horizontal overflow.
- The optional PostgreSQL compatibility job remained green and non-blocking.
- M2.1 adds no LLM requirement, hosted dependency, starting-idea editing, formal approval, or full durable Records/artifact migration.


## 8. Change rule

When implementation changes observable product behavior, update the applicable requirement before or with the code change. When a requirement is intentionally changed, update its acceptance criteria and identify affected implementation and tests.
