# Wayfound Architecture

**Status:** Approved foundation; implementation is incremental

## 1. Architecture decision

Wayfound uses a web application architecture based on Next.js App Router, React, TypeScript, and a relational PostgreSQL data model.

The foundation prototype deliberately uses local fixture data for the illustrative Borrow Desk routes. Increment 2 adds authenticated PostgreSQL-backed workspace state through validated vertical slices. The prototype fixture layer must not become an accidental persistent data source.

## 2. Current implementation boundary

The current implementation contains (validation status is recorded per slice below):

- a responsive application shell and approved Wayfound visual tokens;
- desktop and mobile primary navigation;
- the fixture-backed Borrow Desk scenario and canonical 15-stage journey;
- representative Work, Handoffs, Records, and Release & Care views;
- authenticated PostgreSQL-backed create/list/open/resume workspace routes;
- durable owner-authorized product-scope and business decision records;
- durable owner-owned work-item records created as Proposed, with explicit outcomes, completion conditions, expected evidence, owner-controlled approval/start/block/resume history, and terminal owner-recorded implementation completion;
- durable owner-approved product requirements with one linked acceptance criterion and stable identifiers;
- consequential technical-requirement proposals with exact-revision specialist assignment/review and a separate current-owner approval action that creates a canonical approved technical requirement and criterion;
- durable owner-recorded evidence results linked to acceptance criteria with stable identifiers, provenance, effect, and requirement/criterion revision snapshots;
- durable artifact identities with one stable initial artifact-version identity and an HTTP or HTTPS external reference that Wayfound records without fetching;
- explicit product-owner acceptance of that proposed artifact version as current project direction, with an accepted-version pointer, accepting actor, acceptance time, revisions, and audit history;
- assignment-scoped qualified specialist review of the exact currently accepted artifact version, with a stable reviewer code, bounded competence/question, authenticated reviewer identity, named findings, revision snapshots, and audit history without granting general workspace membership;
- consequential technical-choice proposals with exact-revision specialist assignment/review and a separate current-owner acceptance action under ADR-0004.

The durable owner-decision path still does not authorize consequential technical decisions. Those use the separate ADR-0004 technical-choice proposal/review/acceptance path. A technical choice remains `Proposed` until an assigned specialist records `No blocking finding` on the exact current revision and the current owner separately accepts that reviewed revision as project direction. `Changes required` blocks acceptance, `Advisory` does not satisfy the gate, and specialist review never auto-accepts project direction.

The owner requirement path still approves only product or business behavior within owner authority. Consequential technical behavior uses a separate proposal/review/approval path. A technical requirement proposal remains `Proposed` until an assigned specialist records `No blocking finding` on the exact current revision, including its proposed acceptance criterion, and the current owner separately approves that reviewed revision. Approval creates a canonical requirement with kind `technical`, authority `owner-after-specialist-review`, status `Approved`, and one canonical acceptance criterion. The specialist review does not auto-approve the requirement.

Creating proposed work does not imply that execution started, a specialist accepted the work, implementation completed, or verification occurred. A separate owner action can later record exact `In progress` work as `Implemented`; that state reports bounded implementation completion only and does not establish objective verification, criterion satisfaction, stage completion, validation, or release readiness. Acceptance criteria are conditions, not evidence or verification results. Evidence effects describe a recorded result as `Supports`, `Challenges`, or `Inconclusive`; recording evidence is not a verification decision and does not change the linked requirement from `Approved`. A newly recorded artifact version remains `Proposed` until the owner explicitly accepts that exact version. Artifact acceptance records project direction only. A specialist review records qualified judgment within its declared scope only. Neither artifact acceptance, specialist review, technical-decision acceptance, technical-requirement approval, nor owner-reported work implementation establishes verification, validation, release readiness, or production authorization.

Work dependencies and broader links, multiple criterion lifecycle, later artifact versions/import and supersession behavior, accepted technical-decision replacement/supersession, approved technical-requirement replacement/withdrawal/supersession/deprecation, evidence freshness/outdated-state handling, specialist evidence review, durable AI-assistance provenance/review disposition, external specialist connectors, automatic CI/CD evidence ingestion, production-changing actions, and production release authorization remain unimplemented. Multi-human collaborator administration, ownership transfer, human work assignment, and additional authenticated human-specialist product surfaces are deferred from the active first version by ADR-0005; existing validated specialist implementation remains historical capability.

## 3. Component boundaries

### Presentation

Next.js App Router and React render the workspace. Interactive components use client-side JavaScript only where interaction requires it.

The owner sees specialist artifact assignments and completed reviews directly under the exact accepted artifact version. Technical-choice proposals appear in a separate owner section from owner-only product/business decisions and show proposal revision, requested competence, bounded review question, assignment/review state, acceptance eligibility, and accepted technical-decision linkage when present. Technical-requirement proposals likewise appear separately from canonical approved requirements until owner approval and show the proposed obligation, requirement, criterion, competence, bounded question, exact-revision assignment/review state, approval eligibility, durable earlier review history, and approval linkage. Once approved, the canonical Requirements section identifies the record as technical and shows authority `Owner after required specialist review`. The assigned specialist uses `/specialist-reviews`, which exposes only bounded artifact, technical-choice, or technical-requirement context authorized by stored assignments.

### Application logic

Server-side application functions enforce implemented workspace scope, identity, authorization, input validation, decision authority boundaries, proposed-work semantics, owner work lifecycle and implementation-completion rules, owner-approved product-requirement semantics, consequential technical-requirement proposal/review/approval rules, criterion-evidence semantics, proposed-artifact semantics, explicit owner artifact acceptance, assignment-scoped specialist artifact review, and consequential technical-choice proposal/review/acceptance rules.

Later slices will add durable AI-assistance provenance/review disposition, work dependencies and broader links, later requirement lifecycle, later artifact versions/import lifecycle, reconciliation, change-impact, evidence freshness, verification decisions, and release rules.

### Persistence

PostgreSQL is authoritative for implemented durable workspace, release/stage, owner-decision, proposed-work-item, work-transition history including terminal `Implemented` completion, canonical approved requirement, acceptance-criterion, technical-requirement proposal, technical-requirement review assignment/review, technical-requirement approval linkage, criterion-evidence, artifact identity, artifact-version lifecycle, accepted-version selection, specialist artifact-review assignment/review, technical-choice proposal, technical-choice review assignment/review, accepted technical decision, and their request/audit records.

The current artifact flow stores structured metadata and external references only. Object storage may enter scope when file-backed artifact import is implemented.

### AI guidance

AI guidance is advisory. Generated recommendations and drafts remain distinguishable from approved or accepted project records. AI output must not authorize production actions or silently alter approved scope.

### External tools

The first version uses explicit manual handoff packages and returned-file reconciliation when those workflows enter implementation. Verified direct connectors are later scope. The current artifact and specialist-review flow stores an external URL as reference data and does not fetch or execute referenced content, including during acceptance or specialist review.

## 4. Data authority

For implemented persistent state:

- the Wayfound database owns structured durable workspace state;
- a saved owner decision is an accepted product-scope or business choice only after explicit owner-authority confirmation;
- consequential technical choices are not accepted through the owner-decision action;
- a technical choice created through the ADR-0004 path is a proposal, not an accepted decision;
- a current owner can assign an authenticated specialist by reviewer code to one exact technical-choice proposal revision without granting workspace membership;
- only the assigned live specialist can record the bounded technical-choice review;
- technical-choice review conclusions are `No blocking finding`, `Changes required`, or `Advisory`; only `No blocking finding` makes that exact revision eligible for separate owner acceptance;
- specialist technical-choice review does not itself create an accepted technical decision;
- current-owner acceptance links the exact proposal revision, assignment, and qualifying review into a durable accepted technical decision;
- material technical-choice proposal change increments the proposal revision and makes an earlier review ineligible for acceptance while preserving earlier review history;
- accepted technical decisions are not overwritten by the current slice set; replacement/supersession remains future scope;
- a newly recorded work item is planned work with status `Proposed` and does not establish execution, completion, review, or verification;
- only exact owner-owned `In progress` work can be marked `Implemented`; the transition is owner-reported implementation completion and does not establish verification, criterion satisfaction, stage completion, validation, release readiness, or release;
- `Implemented` is terminal for the bounded work state machine currently exposed by Wayfound;
- a requirement recorded through the owner requirement action is an `Approved` product requirement only after explicit owner-authority confirmation;
- a consequential technical requirement is not approved through the owner requirement action;
- a technical requirement proposal is proposed technical behavior, not an approved requirement;
- a current owner can assign an authenticated specialist by reviewer code to one exact technical-requirement proposal revision without granting workspace membership;
- the technical-requirement assignment snapshots the title, obligation, proposed technical requirement, proposed acceptance criterion, requested competence, and bounded review question;
- only the assigned live specialist can record the bounded technical-requirement review;
- technical-requirement review conclusions are `No blocking finding`, `Changes required`, or `Advisory`; only `No blocking finding` makes that exact revision eligible for separate owner approval;
- specialist technical-requirement review does not itself create an approved requirement or criterion;
- current-owner approval atomically creates one canonical requirement with kind `technical`, authority `owner-after-specialist-review`, status `Approved`, and one acceptance criterion copied from the exact reviewed proposal revision, plus durable approval linkage;
- material technical-requirement proposal change, including a criterion change, increments revision and makes an earlier review ineligible for approval while retaining earlier review history;
- approved technical requirements are not edited in place by this slice; replacement, withdrawal, supersession, and deprecation remain future scope;
- an acceptance criterion is a durable observable condition linked to a requirement and does not represent evidence, a test result, or verification state;
- a criterion evidence record is a durable result with source/provenance and effect `Supports`, `Challenges`, or `Inconclusive`;
- evidence records capture the linked requirement and criterion revisions at recording time so later lifecycle work can identify potentially outdated evidence;
- recording evidence does not mark the criterion satisfied, passed, verified, or validated and does not change the linked requirement from `Approved`;
- a durable artifact has a stable artifact identity and a stable version identity; the current creation action creates only version `1` with lifecycle `Proposed`;
- the artifact external reference is stored as metadata and is not fetched by Wayfound in the current slices;
- the owner can explicitly accept the existing proposed artifact version as current project direction; acceptance changes that version to `Accepted` and records the artifact's `accepted_version_id`, accepting actor, acceptance time, and revisions;
- artifact acceptance does not imply qualified specialist review, technical approval, verification, validation, release readiness, or production authorization;
- an authenticated user can establish a stable specialist reviewer code without gaining workspace membership; the code addresses an actor but does not grant access;
- a current owner can assign that reviewer to the exact currently accepted artifact version with requested competence and one bounded review question;
- only the assigned live specialist actor can record the artifact review, and the review snapshots the artifact/version revisions without changing the accepted artifact or release state;
- a specialist review records named qualified judgment with conclusion `No blocking finding`, `Changes required`, or `Advisory`; those conclusions do not mean `Verified`, `Validated`, or `Released`;
- the authenticated owner or specialist actor and durable target context are resolved from server-side/database state instead of caller-supplied authority data;
- external tool output is input to reconciliation, not automatic project truth;
- chat history is not a project data source.

Future later-version/import behavior must preserve the accepted artifact version until an authorized action selects a later version. Failed imports must not replace accepted artifacts. Future specialist role/membership design must not widen owner authority through generic membership checks.

## 5. Security and authorization

The implemented durable slices use authenticated users, workspace-scoped owner membership checks, assignment-scoped specialist checks, row-level access policies, scoped RPCs, server-side session verification, and no application service key. Direct exposed-table writes are denied.

Owner-decision creation derives actor identity, release, and stage from durable state. It requires explicit product-owner authority confirmation and records `decision.accepted` in the audit log. The database constrains the implemented decision authority to `owner` and status to `Accepted`.

Proposed-work-item creation derives the owner actor, release, and stage from the verified session and current workspace membership. Creation constrains initial work-item status to `Proposed` and records `work_item.proposed` in the audit log. The separate owner lifecycle command permits only the transitions defined in sections 12 and 15 and records `work_item.transitioned`. It does not allow an owner to claim that another collaborator or specialist accepted assignment, and `Implemented` does not confer verification authority.

Owner-requirement creation derives the approving actor, release, and stage from the verified session and current owner membership. It requires explicit owner-authority confirmation, constrains kind to `product`, authority to `owner`, and status to `Approved`, creates one acceptance criterion in the same transaction, and records `requirement.approved` in the audit log. This action cannot create a consequential technical requirement.

Technical-requirement proposal creation derives the current owner, release, and stage from authoritative state and records a `Proposed` technical requirement proposal rather than a canonical requirement. Assignment binds one authenticated reviewer to the exact proposal revision and snapshots the requirement, proposed criterion, competence area, and bounded question without granting workspace membership. Review submission derives the specialist from the live session, requires the matching assignment and exact revision, and records one of the three allowed conclusions. Owner approval derives the current owner from the live session, locks the proposal and review context, requires `No blocking finding` on the exact current revision, and atomically creates the canonical technical requirement, its criterion, approval linkage, proposal state change, audit event, and request result. Owner self-review, stale review, cross-tenant targets, revoked membership/assignment/session, and direct-table writes are denied.

Criterion-evidence creation derives the recorder actor from the verified session and resolves the linked requirement, release, stage, requirement revision, and criterion revision from durable state. It requires current owner membership, rejects unknown or cross-workspace criteria, constrains effect to `Supports`, `Challenges`, or `Inconclusive`, and records `evidence.recorded` in the audit log. This action does not confer criterion verification or specialist approval.

Proposed-artifact creation derives the creating actor, current release, and current stage from the verified session and durable workspace state. It constrains the initial artifact version to version `1`, lifecycle `Proposed`, source kind `ExternalReference`, and HTTP or HTTPS references, and records `artifact.proposed` in the audit log. It does not accept project direction.

Artifact acceptance derives the accepting actor from the verified live session and current owner membership, requires explicit product-owner authority confirmation, locks and verifies the exact workspace/artifact/version target, requires lifecycle `Proposed`, changes only that version to `Accepted`, records the artifact accepted-version pointer and acceptance metadata, and records `artifact.accepted` with the accepted version as the audited entity. Direct client writes cannot set acceptance state. This action does not confer specialist review or verification.

ADR-0003 deliberately keeps specialist reviewers outside the existing workspace membership table because earlier owner mutations include generic membership predicates. An authenticated reviewer can establish an actor/reviewer code without gaining workspace membership. Owner artifact-review assignment derives the current owner from a live session, requires explicit bounded-scope confirmation, and targets only the exact currently accepted artifact version. Specialist submission derives the reviewer from the live session, requires a matching stored assignment and explicit competence confirmation, rejects stale/non-current accepted versions, and records `specialist_review.recorded`. The specialist cannot use that assignment to list/open the owner's workspace or execute owner mutations.

ADR-0004 extends the same bounded specialist identity model to consequential technical choices and, by this bounded extension, consequential technical requirements without broadening workspace membership. Technical-choice proposal creation derives the current owner, release, and stage from authoritative state and records a `Proposed` choice. Assignment binds one authenticated reviewer to the exact proposal revision, competence area, and bounded question. Review submission derives the specialist from the live session, requires the matching assignment and exact revision, and records one of the three allowed conclusions. Owner acceptance derives the current owner from the live session, locks the proposal/review context, requires `No blocking finding` on the exact current proposal revision, and atomically creates the linked accepted technical decision. Owner self-review, stale review, cross-tenant targets, revoked membership/assignment/session, and direct-table writes are denied.

The broader production architecture must also provide role-aware collaborator administration before broad specialist workspace membership if multi-human collaboration is reintroduced, validation at file and external-input boundaries, no committed secrets, and audit records for material acceptance and authorization events.

Security design that changes trust boundaries or introduces consequential dependencies requires an Architecture Decision Record.

## 6. Failure behavior

Material workflows preserve the last accepted, approved, or committed project state when a proposed operation fails.

Implemented examples:

- durable workspace creation is transactional and leaves no partial record after an injected failure;
- owner-decision creation is transactional and rolls back the decision, audit event, and request result when audit insertion fails;
- proposed-work-item creation is transactional and rolls back the work item, audit event, and request result when audit insertion fails;
- owner-requirement creation is transactional and rolls back the requirement, linked criterion, audit event, and request result when audit insertion fails;
- technical-requirement proposal creation, specialist assignment, specialist review, and owner approval are transactional and roll back their mutation, audit event, and request result when an injected audit failure occurs;
- technical-requirement owner approval atomically creates the canonical requirement, criterion, approval linkage, proposal state change, audit event, and request result;
- concurrent distinct technical-requirement approval requests against the same eligible state produce one durable winner;
- a material technical-requirement proposal revision makes an earlier review stale for approval while preserving it as history;
- criterion-evidence creation is transactional and rolls back the evidence record, audit event, and request result when audit insertion fails;
- proposed-artifact creation is transactional and rolls back the artifact identity, artifact version, audit event, and request result when audit insertion fails;
- artifact acceptance is transactional and rolls back version lifecycle, accepted-version pointer, acceptance metadata, revisions, audit event, and request result when audit insertion fails;
- specialist artifact-review assignment is transactional and rolls back the assignment, audit event, and request result when audit insertion fails;
- specialist artifact-review submission is transactional and rolls back the review, assignment completion state, audit event, and request result when audit insertion fails;
- owner work transitions, including implementation completion, are transactional and roll back work state, immutable transition history, audit event, and request result when audit insertion fails;
- concurrent distinct work-completion requests against the same exact `In progress` revision produce one durable winner;
- technical-choice proposal creation, specialist assignment, specialist review, and owner acceptance are transactional and roll back their mutation, audit event, and request result when an injected audit failure occurs;
- concurrent distinct technical-decision acceptance requests against the same eligible state produce one durable winner;
- a material technical-choice proposal revision makes an earlier review stale for acceptance;
- database interruption renders a recoverable error and does not substitute fixture data;
- successful same-route decision, work-item, requirement, technical-requirement, evidence, artifact-create, artifact-accept, specialist-assignment/review, work-lifecycle/completion, and technical-choice actions explicitly revalidate their relevant views before redirect so rendered state matches committed state.

Future failed imports must preserve accepted artifacts; failed reconciliation must not partially accept returned work; interrupted release actions must not be reported as successful without outcome evidence; unknown dependency impact remains unresolved rather than becoming “no impact.”

The persistence adapters use a bounded retry only for PostgREST error `PGRST303` with the exact message `JWT issued at future`. Other persistence and authorization failures are not converted to success.

## 7. Observability

Important failures must be diagnosable without logging secrets or unnecessary sensitive data. Implemented durable mutations record scoped audit events and correlation/request context. Later observability work must extend this baseline to durable AI-assistance provenance, later requirement lifecycle, later artifact versions/import, evidence freshness and verification decisions, change-impact, and release workflows.

## 8. Deployment and rollback

The durable slices have been validated against isolated local Supabase in CI. No hosted persistence project or production data deployment is established by that validation.

Before production data exists, Wayfound must define repeatable deployment and rollback behavior for the chosen hosting and persistence services. Recovery claims require executed restore evidence.

## 9. Technology baseline

The prototype source currently targets:

- Next.js 16.3.x App Router;
- React 19.3.x;
- TypeScript 7.0.x;
- Tailwind CSS 4.3.x;
- Lucide React for interface icons.

These versions remain implementation details within the approved Next.js 14+ architecture family. Dependency versions should be reviewed during each release rather than treated as permanent product requirements.

## 10. Reconsideration triggers

Revisit the architecture when validated product behavior cannot be represented cleanly by the current record model, persistence or file-volume needs materially exceed the planned model, direct integrations enter approved scope, AI or external actions gain authority beyond drafting and recommendations, or security/privacy/availability/regulatory requirements materially change.

## 11. Increment 2 implementation

[ADR-0002](adr/0002-durable-workspace-identity.md) defines the accepted identity and persistence boundary. [ADR-0003](adr/0003-assignment-scoped-specialist-review.md) defines the accepted bounded specialist-review authority model. [ADR-0004](adr/0004-technical-decision-review-and-acceptance.md) defines the accepted split-authority model for consequential technical choices and supplies the same final-authority rule reused by the bounded technical-requirement slice. `lib/application` owns use-case validation and actor checks, `lib/auth` owns Supabase identity access, `lib/persistence` owns bounded database calls, and `lib/domain` owns provider-independent contracts and the canonical journey catalog.

The private `wayfound` schema owns durable state. Privileged mutations are scoped transactions behind invoker RPC wrappers; no direct client table writes or application service keys are permitted. Reads verify the current provider session and the exact owner-membership or specialist-assignment authorization required for the resource. AI is not connected to persisted authority.

The create/list/open/resume slice is **Validated** at application commit `603f02862ae4090bd1853157e449a01508186f4c` through CI run 70. See [validation/increment-2-durable-workspace.md](validation/increment-2-durable-workspace.md).

The owner-authorized decision slice is **Validated** at application commit `548f1bbb4264ca412bc808a94a60593bca2c3602` through CI run 92. It records only product-scope and business decisions after explicit owner-authority confirmation. See [validation/increment-2-decisions.md](validation/increment-2-decisions.md).

The proposed-work-item slice is **Validated** at application commit `1f2a1c99856119c845a4495b61674bea415a4a77` through CI run 113. It records owner-owned bounded planned work with status `Proposed`, explicit completion conditions, and expected evidence, without implying execution or verification. See [validation/increment-2-work-items.md](validation/increment-2-work-items.md).

The owner-approved product-requirement slice is **Validated** at application commit `9e2af6940ce4d440fed00825620e0b693eff17c2` through CI run 131. It records only owner-authorized product requirements with one durable acceptance criterion and keeps that criterion distinct from verification evidence. See [validation/increment-2-requirements.md](validation/increment-2-requirements.md).

The criterion-evidence slice is **Validated** at application commit `4f67d99078600735f086ae894017481234a5a109` through CI run 151. It records durable owner-entered evidence results directly against an acceptance criterion, snapshots the linked requirement and criterion revisions, and preserves `Approved` requirement state without creating a verification state. See [validation/increment-2-evidence.md](validation/increment-2-evidence.md).

The durable proposed-artifact slice is **Validated** at application commit `8d36adede6c4b5c5570b7a3e37a519588124500b` through CI run 157. It creates a stable artifact identity and version 1 with lifecycle `Proposed`, stores an external reference without fetching it, and does not create accepted project direction. See [validation/increment-2-artifacts.md](validation/increment-2-artifacts.md).

The owner artifact-acceptance slice is **Validated** at repository head `3ca0ea4a1fe931e80a9466250915efe623827847` through CI run 164. It requires explicit product-owner authority to select the exact proposed version as accepted project direction, records the accepted-version pointer and acceptance metadata, preserves the no-fetch external-reference boundary, and does not imply specialist review or verification. See [validation/increment-2-artifact-acceptance.md](validation/increment-2-artifact-acceptance.md).

The assignment-scoped specialist artifact-review slice is **Validated** at application head `fc91a4377e887cada269fb35b2192f5c3efad15b` through CI run 172. It gives authenticated specialists a stable reviewer code without workspace membership, lets the owner assign one specialist to one exact accepted artifact version, records named qualified judgment with revision snapshots, proves that the specialist cannot execute owner mutations, and preserves the boundary between specialist review and verification. See [validation/increment-2-specialist-review.md](validation/increment-2-specialist-review.md).

The owner work lifecycle slice is **Validated** at application head `1c3d8a52a820163340b8742f3f8f3a24f7115545` through CI run 179. See [validation/increment-2-work-lifecycle.md](validation/increment-2-work-lifecycle.md).

The consequential technical-decision authority slice is **Validated** at application head `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b` through CI run 201. It preserves split authority: owner proposal, exact-revision specialist review, and separate owner acceptance. See [validation/increment-2-technical-decisions.md](validation/increment-2-technical-decisions.md).

The consequential technical-requirement authority slice is **Validated** at application head `ec9612e2e87c05780558471a9ab9d76246be417b` through CI run 220. It preserves split authority over the exact requirement and proposed criterion, and separate owner approval creates the canonical approved technical requirement and criterion. See [validation/increment-2-technical-requirements.md](validation/increment-2-technical-requirements.md).

The owner work implementation-completion slice is **Validated** at application head `b28e1718174d84e66c7e97fe203de12034d3b2ba` through CI run 308. It extends exact `In progress` owner work to terminal `Implemented`, preserves immutable history/idempotency/one-winner concurrency, and leaves verification, requirement/evidence, stage, and release state unchanged. See [validation/increment-2-work-completion.md](validation/increment-2-work-completion.md).

No hosted project or production deployment exists. Broader Increment 2 remains In progress for durable AI-assistance provenance/review disposition, work dependencies and broader durable record links, multiple criterion lifecycle, evidence freshness and verification lifecycle, maintenance, later lifecycle/change-impact behavior, accepted technical-decision replacement/supersession, and approved technical-requirement replacement/withdrawal/supersession/deprecation. Later artifact-version, accepted-version replacement/supersession, and file-import behavior are assigned to Increment 3. Multi-human collaborator administration and human work assignment are deferred from the active first version by ADR-0005.

## 12. Owner work lifecycle extension

**Status:** Validated at application head `1c3d8a52a820163340b8742f3f8f3a24f7115545`, CI run 179. See [validation evidence](validation/increment-2-work-lifecycle.md).

[Owner work lifecycle](INCREMENT_2_WORK_LIFECYCLE.md) extends the durable work record with Proposed → Approved → In progress, In progress → Blocked, and Blocked → In progress. The owner must have current explicit owner membership and must own the target work item. Approval accepts planned work within owner authority only. It does not approve consequential technical choices or establish specialist review, completion, verification, or release authority.

The private transition command locks membership and the work row, checks the expected revision, and atomically records state/revision, immutable transition history, audit event, and request result. Exact duplicate replay returns its original transition ID after live authorization; changed payload or stale distinct requests fail. Owner reads include ordered history. UI controls expose only the allowed next action, require a reason/confirmation, and preserve entered details after an error.

No membership role or specialist authority changes. The migration preserves existing Proposed records. Because the earlier reader described every work item as Proposed, recovery must retain a state-aware reader; do not restore the old status constraint or drop history after transitions exist. Work completion is implemented separately in section 15; human assignment is deferred from the active first version by ADR-0005, while dependencies and technical acceptance remain separate scope.

## 13. Consequential technical-decision authority extension

**Status:** Validated at application head `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b`, CI run 201. See [validation evidence](validation/increment-2-technical-decisions.md).

[Consequential technical decision review and acceptance](INCREMENT_2_TECHNICAL_DECISIONS.md) implements ADR-0004 Option A. The current workspace owner creates a technical choice proposal and assigns an authenticated specialist by stable reviewer code to the exact proposal revision, requested competence, and one bounded question. The specialist remains outside workspace membership and can review only assigned bounded context.

A completed `No blocking finding` review makes only that exact proposal revision eligible for separate owner acceptance. `Changes required` blocks acceptance and `Advisory` does not satisfy the gate. Specialist review does not auto-accept. Owner acceptance links the proposal, exact revision, assignment, review, reviewer, accepting owner, and acceptance time into the accepted technical decision.

Material proposal changes increment revision and invalidate older reviews for acceptance while retaining them as history. Owner self-review is denied. Transactions preserve idempotency, exact-target authorization, one-winner concurrency, audit rollback, and live-session checks. Database interruption shows a recoverable error without fixture substitution.

This extension does not implement accepted technical-decision replacement/supersession, verification, validation, release readiness, release authorization, or production-changing actions.

## 14. Consequential technical-requirement authority extension

**Status:** Validated at application head `ec9612e2e87c05780558471a9ab9d76246be417b`, CI run 220. See [validation evidence](validation/increment-2-technical-requirements.md).

[Consequential technical requirement review and approval](INCREMENT_2_TECHNICAL_REQUIREMENTS.md) reuses the accepted ADR-0004 split between qualified specialist review and owner project-direction authority. The current workspace owner creates a technical requirement proposal containing an obligation, proposed technical requirement statement, one proposed acceptance criterion, requested competence, and one bounded question. The owner assigns an authenticated specialist by stable reviewer code to the exact proposal revision. The specialist remains outside workspace membership and can review only assigned bounded context.

A completed `No blocking finding` review makes only that exact requirement-and-criterion revision eligible for separate owner approval. `Changes required` blocks approval and `Advisory` does not satisfy the gate. Specialist review does not auto-approve. Owner approval atomically creates a canonical requirement with kind `technical`, authority `owner-after-specialist-review`, status `Approved`, and one canonical acceptance criterion, together with the durable approval linkage to the proposal, revision, assignment, review, reviewer, approving owner, and approval time.

The existing owner-only requirement command remains constrained to kind `product` and authority `owner`; it cannot be used to manufacture technical authority. Material proposal changes, including criterion changes, increment revision and invalidate older reviews for approval while preserving earlier review history. Owner self-review is denied. Transactions preserve idempotency, exact-target authorization, one-winner concurrency, audit rollback, live-session checks, and recoverable database interruption behavior without fixture substitution.

This extension does not implement requirement replacement, withdrawal, supersession or deprecation, multiple acceptance criteria, multiple mandatory specialist disciplines, formal waivers/disputes, evidence freshness, explicit verification decisions, release readiness, release authorization, or production-changing actions.

## 15. Owner work implementation completion extension

**Status:** Validated at application head `b28e1718174d84e66c7e97fe203de12034d3b2ba`, CI run 308. See [validation evidence](validation/increment-2-work-completion.md).

[Work implementation completion](INCREMENT_2_WORK_COMPLETION.md) extends the existing owner transition command rather than creating a parallel mutation path. Only exact `In progress` work owned by the current authenticated workspace owner can become `Implemented`. `Proposed`, `Approved`, and `Blocked` work cannot skip directly to implementation completion. `Implemented` is terminal for this bounded state machine.

The command uses the existing membership and work-row locks, expected revision, live actor/owner checks, immutable transition history, `work_item.transitioned` audit event, and idempotent request result. Exact replay is resolved after live authorization and target locking but before terminal-state rejection so a committed completion retry returns the original transition ID. Changed replay payloads fail. Distinct completion requests against the same revision serialize and produce exactly one durable winner.

The UI exposes both `Mark implemented` and `Block work` while a record is `In progress`. Once implemented, it shows the completion note and earlier history with no further state action. Overview excludes implemented work from unfinished current-stage recommendations while retaining it in Recent changes. Desktop and 390 px rendered validation confirms the terminal status and explicit statement that verification and release remain separate.

`Implemented` is an owner-reported work state only. It does not change requirements, criteria, evidence, artifacts, stage lifecycle, release lifecycle, verification, validation, release readiness, release authorization, deployment, or production state. Existing rows require no backfill. After the additive migration, recovery must retain an application reader that understands `Implemented`; prefer a forward fix over destructive constraint or history rollback.
