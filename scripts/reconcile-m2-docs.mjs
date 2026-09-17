import { readFile, writeFile } from 'node:fs/promises';

const productPath = 'docs/PRODUCT_REQUIREMENTS.md';
const deliveryPath = 'docs/DELIVERY_PLAN.md';

let product = await readFile(productPath, 'utf8');

const m2Requirements = `### WF-017 — Map authenticated users to stable Wayfound Actors

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
- Propose requires the \`artifact.propose\` project capability.
- Propose snapshots the title, statement, content hash, and immutable Artifact Revision.
- The proposal stores Trace Links to the exact current Record Revisions supplied as sources.
- If any supplied source revision is no longer current, the command is rejected and the user must rebuild or review the draft.
- The Project version advances transactionally with the proposal.
- The resulting lifecycle state is \`proposed\`.
- M2 exposes no command or database lifecycle state that can turn the proposal into \`approved\`.

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

- The project creator receives the M2 \`owner\` role.
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

- The configured Wayfound data environment is explicitly \`development\`, \`preview\`, or \`production\`.
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

`;

if (!product.includes('### WF-017 —')) {
  product = product.replace('## 5. Non-functional requirements', `${m2Requirements}## 5. Non-functional requirements`);
}

product = product.replace(
  'Production authentication, authorization, and security boundaries remain `TBD`.',
  'Production authentication and authority boundaries are defined by ADR-0003, ADR-0005, and ADR-0007. M2 MUST enforce those boundaries through WF-017 and WF-021 before durable project commands are accepted.',
);
product = product.replace(
  'Persistence, recovery after browser closure, and multi-device continuity remain `TBD`.',
  'M2 durable project persistence MUST survive browser/session loss for the bounded project state defined by WF-018 through WF-020. Stale consequential writes MUST fail rather than use silent last-write-wins behavior.',
);
product = product.replace(
  'If a future hosted version stores user content or sends it to external AI services, privacy, retention, deletion, consent, and age-related controls MUST be defined before that behavior is implemented.',
  'M2 MAY use synthetic/development content to validate hosted persistence. Production release with real hosted user content remains blocked until retention, deletion, consent, and age-related requirements for the intended users are approved. External AI processing of project content is outside M2.',
);
product = product.replace(
  'Production observability remains `TBD`. The static prototype has no production runtime service.',
  'M2 MUST produce content-minimal structured command telemetry sufficient to diagnose command, identity, database, and migration failures without copying unrestricted project text. The observability vendor remains `TBD`.',
);

const indexRows = `| WF-017 | Map authenticated users to stable Wayfound Actors | P0 | Approved | Auth/Actor integration tests |\n| WF-018 | Create and reopen a private durable project through server authority | P0 | Approved | Project/PostgreSQL integration + browser reopen |\n| WF-019 | Persist accepted answers as immutable revisions with traceable Records | P0 | Approved | Domain + PostgreSQL integration tests |\n| WF-020 | Materialize a proposal against exact current source revisions | P0 | Approved | Domain + PostgreSQL integration tests |\n| WF-021 | Enforce Wayfound project authorization for project data and commands | P0 | Approved | Capability + route/integration tests |\n| WF-022 | Keep the first hosted-data slice isolated and content-minimal | P0 | Approved | Environment/config/logging/release-gate review |\n`;
if (!product.includes('| WF-017 |')) {
  product = product.replace('## 7. Validation record', `${indexRows}\n## 7. Validation record`);
}

await writeFile(productPath, product);

let delivery = await readFile(deliveryPath, 'utf8');
delivery = delivery.replace(
  '**Status:** Proposed — requirements and implementation slice still need to be defined before coding starts.',
  '**Status:** In progress — WF-017 through WF-022 are approved and implementation is active in PR #9. Automated build, PostgreSQL, backup/restore, and migration rollback gates run in CI; live Clerk/preview browser validation remains pending.',
);
delivery = delivery.replace(
  '| Define M2 production requirements | Future WF requirements | Project owner | Next | Accepted M1 | Requirements review |',
  '| Define M2 production requirements | WF-017 through WF-022 | Project owner | Approved | Accepted M1 | Requirements review |',
);
delivery = delivery.replace(
  '| Scaffold production Next.js/TypeScript application | ADR-0007 | Implementation | Blocked | M2 requirements approved | Build/test gate |',
  '| Scaffold production Next.js/TypeScript application | ADR-0007 / WF-017 through WF-022 | Implementation | In progress | Approved M2 requirements | CI build/type/test gate |',
);
delivery = delivery.replace(
  '| Define initial Neon relational schema/migrations | ADR-0002 / ADR-0007 | Implementation | Blocked | M2 requirements approved | Schema/integration tests |',
  '| Define initial Neon relational schema/migrations | ADR-0002 / ADR-0007 / WF-018 through WF-020 | Implementation | In progress | Approved M2 requirements | PostgreSQL integration + rollback/restore gates |',
);
delivery = delivery.replace(
  '| Integrate Clerk identity → Wayfound Actor mapping | ADR-0003 / ADR-0007 | Implementation | Blocked | M2 requirements approved | Auth/authorization tests |',
  '| Integrate Clerk identity → Wayfound Actor mapping | ADR-0003 / ADR-0007 / WF-017 | Implementation | In progress | Approved M2 requirements | Stable-Actor integration + non-production Clerk validation |',
);
await writeFile(deliveryPath, delivery);
