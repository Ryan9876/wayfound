from pathlib import Path
import re

path = Path('docs/PRODUCT_REQUIREMENTS.md')
text = path.read_text()

m2 = '''### WF-017 — Reuse a stable local Wayfound Actor without requiring sign-in

**Status:** Approved

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

**Status:** Approved

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

**Status:** Approved

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

**Status:** Approved

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

**Status:** Approved

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

**Status:** Approved

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

'''

start = text.index('### WF-017')
end = text.index('## 5. Non-functional requirements')
text = text[:start] + m2 + text[end:]

nfr_start = text.index('### 5.1 Security')
nfr_end = text.index('## 6. Requirement index')
nfr = '''### 5.1 Security

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

'''
text = text[:nfr_start] + nfr + text[nfr_end:]

index_pattern = re.compile(r'\| WF-017 .*?\n\| WF-022 .*?\n', re.S)
index = '''| WF-017 | Reuse a stable local Wayfound Actor without requiring sign-in | P0 | Approved | Local Actor persistence/reopen tests |\n| WF-018 | Create and reopen a private durable local project through server authority | P0 | Approved | SQLite integration + reopen tests |\n| WF-019 | Persist accepted answers as immutable local revisions with traceable Records | P0 | Approved | Domain + SQLite integration tests |\n| WF-020 | Materialize a proposal against exact current local source revisions | P0 | Approved | Domain + SQLite integration tests |\n| WF-021 | Enforce Wayfound project authorization in local and optional hosted modes | P0 | Approved | Capability + adapter integration tests |\n| WF-022 | Keep project content local by default and make AI egress explicit | P0 | Approved | AI boundary + logging + no-cloud build tests |\n'''
text, count = index_pattern.subn(index, text, count=1)
if count != 1:
    raise SystemExit('Could not replace WF-017..WF-022 requirement index block')

path.write_text(text)
