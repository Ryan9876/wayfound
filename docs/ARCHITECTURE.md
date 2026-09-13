# Wayfound Architecture

**Status:** Approved foundation; implementation is incremental

## 1. Architecture decision

Wayfound uses a web application architecture based on Next.js App Router, React, TypeScript, and a relational PostgreSQL data model.

The foundation prototype deliberately uses local fixture data for the illustrative Borrow Desk routes. Increment 2 adds authenticated PostgreSQL-backed workspace state through validated vertical slices. The prototype fixture layer must not become an accidental persistent data source.

## 2. Current implementation boundary

The current implementation contains:

- a responsive application shell and approved Wayfound visual tokens;
- desktop and mobile primary navigation;
- the fixture-backed Borrow Desk scenario and canonical 15-stage journey;
- representative Work, Handoffs, Records, and Release & Care views;
- authenticated PostgreSQL-backed create/list/open/resume workspace routes;
- durable owner-authorized product-scope and business decision records;
- durable owner-owned proposed work-item records with explicit outcomes, completion conditions, and expected evidence;
- durable owner-approved product requirements with one linked acceptance criterion and stable identifiers;
- durable owner-recorded evidence results linked to acceptance criteria with stable identifiers, provenance, effect, and requirement/criterion revision snapshots;
- durable artifact identities with one stable initial artifact-version identity and an HTTP or HTTPS external reference that Wayfound records without fetching;
- explicit product-owner acceptance of that proposed artifact version as current project direction, with an accepted-version pointer, accepting actor, acceptance time, revisions, and audit history;
- assignment-scoped qualified specialist review of the exact currently accepted artifact version, with a stable reviewer code, bounded competence/question, authenticated reviewer identity, named findings, revision snapshots, and audit history without granting general workspace membership.

The durable decision path does not authorize consequential technical decisions. Those require qualified specialist review and remain later scope. Proposed work items do not imply that execution started, a specialist accepted the work, implementation completed, or verification occurred. The owner requirement path approves only product or business behavior within owner authority; consequential technical implementation choices remain subject to qualified specialist review. Acceptance criteria are conditions, not evidence or verification results. Evidence effects describe a recorded result as `Supports`, `Challenges`, or `Inconclusive`; recording evidence is not a verification decision and does not change the linked requirement from `Approved`. A newly recorded artifact version remains `Proposed` until the owner explicitly accepts that exact version. Artifact acceptance records project direction only. A specialist review records qualified judgment within its declared scope only. Neither artifact acceptance nor specialist review establishes verification, validation, release readiness, or production authorization.

Work completion transitions, collaborator membership/administration, dependencies and broader links, technical-decision and technical-requirement specialist review, multiple criterion lifecycle, later artifact versions/import and supersession behavior, evidence freshness/outdated-state handling, specialist evidence review, external specialist connectors, automatic CI/CD evidence ingestion, production-changing actions, and production release authorization remain unimplemented.

## 3. Component boundaries

### Presentation

Next.js App Router and React render the workspace. Interactive components use client-side JavaScript only where interaction requires it.

The owner sees specialist assignments and completed reviews directly under the exact accepted artifact version. The assigned specialist uses a separate `/specialist-reviews` workspace that exposes only the bounded review context authorized by the stored assignment.

### Application logic

Server-side application functions enforce implemented workspace scope, identity, authorization, input validation, decision authority boundaries, proposed-work semantics, owner-approved product-requirement semantics, criterion-evidence semantics, proposed-artifact semantics, explicit owner artifact acceptance, and assignment-scoped specialist artifact review. Later slices will add work completion transitions, collaborator membership and broader links, specialist technical-decision/requirement review, later artifact versions/import lifecycle, reconciliation, change-impact, evidence freshness, verification decisions, and release rules.

### Persistence

PostgreSQL is authoritative for implemented durable workspace, release/stage, owner-decision, proposed-work-item, owner-approved requirement, acceptance-criterion, criterion-evidence, artifact identity, artifact-version lifecycle, accepted-version selection, specialist-review assignment, and specialist-review records. The current artifact flow stores structured metadata and external references only. Object storage may enter scope when file-backed artifact import is implemented.

### AI guidance

AI guidance is advisory. Generated recommendations and drafts remain distinguishable from approved or accepted project records. AI output must not authorize production actions or silently alter approved scope.

### External tools

The first version uses explicit manual handoff packages and returned-file reconciliation when those workflows enter implementation. Verified direct connectors are later scope. The current artifact and specialist-review flow stores an external URL as reference data and does not fetch or execute referenced content, including during acceptance or specialist review.

## 4. Data authority

For implemented persistent state:

- the Wayfound database owns structured durable workspace state;
- a saved owner decision is an accepted product-scope or business choice only after explicit owner-authority confirmation;
- technical choices that require qualified specialist review are not accepted through the owner-decision action;
- a newly recorded work item is planned work with status `Proposed` and does not establish execution, completion, review, or verification;
- a requirement recorded through the owner action is an `Approved` product requirement only after explicit owner-authority confirmation;
- a consequential technical implementation requirement is not approved through the owner requirement action;
- an acceptance criterion is a durable observable condition linked to a requirement and does not represent evidence, a test result, or verification state;
- a criterion evidence record is a durable result with source/provenance and effect `Supports`, `Challenges`, or `Inconclusive`;
- evidence records capture the linked requirement and criterion revisions at recording time so later lifecycle work can identify potentially outdated evidence;
- recording evidence does not mark the criterion satisfied, passed, verified, or validated and does not change the linked requirement from `Approved`;
- a durable artifact has a stable artifact identity and a stable version identity; the current creation action creates only version `1` with lifecycle `Proposed`;
- the artifact external reference is stored as metadata and is not fetched by Wayfound in the current slices;
- the owner can explicitly accept the existing proposed version as current project direction; acceptance changes that version to `Accepted` and records the artifact's `accepted_version_id`, accepting actor, acceptance time, and revisions;
- artifact acceptance does not imply qualified specialist review, technical approval, verification, validation, release readiness, or production authorization;
- an authenticated user can establish a stable specialist reviewer code without gaining workspace membership; the code addresses an actor but does not grant access;
- a current owner can assign that reviewer to the exact currently accepted artifact version with requested competence and one bounded review question;
- only the assigned live specialist actor can record the review, and the review snapshots the artifact/version revisions without changing the accepted artifact or release state;
- a specialist review records named qualified judgment with conclusion `No blocking finding`, `Changes required`, or `Advisory`; those conclusions do not mean `Verified`, `Validated`, or `Released`;
- the authenticated owner or specialist actor and durable target context are resolved from server-side/database state instead of caller-supplied authority data;
- external tool output is input to reconciliation, not automatic project truth;
- chat history is not a project data source.

Future later-version/import behavior must preserve the accepted artifact version until an authorized action selects a later version. Failed imports must not replace accepted artifacts. Future specialist role/membership design must not widen owner authority through generic membership checks.

## 5. Security and authorization

The implemented durable slices use authenticated users, workspace-scoped owner membership checks, assignment-scoped specialist checks, row-level access policies, scoped RPCs, server-side session verification, and no application service key. Direct exposed-table writes are denied.

Owner-decision creation derives actor identity, release, and stage from durable state. It requires explicit product-owner authority confirmation and records `decision.accepted` in the audit log. The database constrains the implemented decision authority to `owner` and status to `Accepted`.

Proposed-work-item creation derives the owner actor, release, and stage from the verified session and current workspace membership. The database constrains the implemented work-item status to `Proposed` and records `work_item.proposed` in the audit log. This slice does not allow an owner to claim that another collaborator or specialist accepted assignment.

Owner-requirement creation derives the approving actor, release, and stage from the verified session and current owner membership. It requires explicit owner-authority confirmation, constrains kind to `product`, authority to `owner`, and status to `Approved`, creates one acceptance criterion in the same transaction, and records `requirement.approved` in the audit log. This action does not confer specialist approval on consequential technical choices.

Criterion-evidence creation derives the recorder actor from the verified session and resolves the linked requirement, release, stage, requirement revision, and criterion revision from durable state. It requires current owner membership, rejects unknown or cross-workspace criteria, constrains effect to `Supports`, `Challenges`, or `Inconclusive`, and records `evidence.recorded` in the audit log. This action does not confer criterion verification or specialist approval.

Proposed-artifact creation derives the creating actor, current release, and current stage from the verified session and durable workspace state. It constrains the initial artifact version to version `1`, lifecycle `Proposed`, source kind `ExternalReference`, and HTTP or HTTPS references, and records `artifact.proposed` in the audit log. It does not accept project direction.

Artifact acceptance derives the accepting actor from the verified live session and current owner membership, requires explicit product-owner authority confirmation, locks and verifies the exact workspace/artifact/version target, requires lifecycle `Proposed`, changes only that version to `Accepted`, records the artifact accepted-version pointer and acceptance metadata, and records `artifact.accepted` with the accepted version as the audited entity. Direct client writes cannot set acceptance state. This action does not confer specialist review or verification.

ADR-0003 deliberately keeps specialist reviewers outside the existing workspace membership table because earlier owner mutations include generic membership predicates. An authenticated reviewer can establish an actor/reviewer code without gaining workspace membership. Owner assignment derives the current owner from a live session, requires explicit bounded-scope confirmation, and targets only the exact currently accepted artifact version. Specialist submission derives the reviewer from the live session, requires a matching stored assignment and explicit competence confirmation, rejects stale/non-current accepted versions, and records `specialist_review.recorded`. The specialist cannot use that assignment to list/open the owner's workspace or execute owner mutations.

The broader production architecture must also provide role-aware collaborator administration before broad specialist workspace membership, qualified technical-decision/requirement review records, validation at file and external-input boundaries, no committed secrets, and audit records for material acceptance and authorization events.

Security design that changes trust boundaries or introduces consequential dependencies requires an Architecture Decision Record.

## 6. Failure behavior

Material workflows preserve the last accepted, approved, or committed project state when a proposed operation fails.

Implemented examples:

- durable workspace creation is transactional and leaves no partial record after an injected failure;
- owner-decision creation is transactional and rolls back the decision, audit event, and request result when audit insertion fails;
- proposed-work-item creation is transactional and rolls back the work item, audit event, and request result when audit insertion fails;
- owner-requirement creation is transactional and rolls back the requirement, linked criterion, audit event, and request result when audit insertion fails;
- criterion-evidence creation is transactional and rolls back the evidence record, audit event, and request result when audit insertion fails;
- proposed-artifact creation is transactional and rolls back the artifact identity, artifact version, audit event, and request result when audit insertion fails;
- artifact acceptance is transactional and rolls back version lifecycle, accepted-version pointer, acceptance metadata, revisions, audit event, and request result when audit insertion fails;
- specialist-review assignment is transactional and rolls back the assignment, audit event, and request result when audit insertion fails;
- specialist review submission is transactional and rolls back the review, assignment completion state, audit event, and request result when audit insertion fails;
- database interruption renders a recoverable error and does not substitute fixture data;
- successful same-route decision, work-item, requirement, evidence, artifact-create, artifact-accept, specialist-assignment, and specialist-review actions explicitly revalidate their relevant views before redirect so rendered state matches committed state.

Future failed imports must preserve accepted artifacts; failed reconciliation must not partially accept returned work; interrupted release actions must not be reported as successful without outcome evidence; unknown dependency impact remains unresolved rather than becoming “no impact.”

The persistence adapters use a bounded retry only for PostgREST error `PGRST303` with the exact message `JWT issued at future`. Other persistence and authorization failures are not converted to success.

## 7. Observability

Important failures must be diagnosable without logging secrets or unnecessary sensitive data. Implemented durable mutations record scoped audit events and correlation/request context. Later observability work must extend this baseline to specialist technical-decision/requirement review, later artifact versions/import, work-state transition, evidence freshness and verification decisions, change-impact, and release workflows.

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

[ADR-0002](adr/0002-durable-workspace-identity.md) defines the accepted identity and persistence boundary. [ADR-0003](adr/0003-assignment-scoped-specialist-review.md) defines the accepted bounded specialist-review authority model. `lib/application` owns use-case validation and actor checks, `lib/auth` owns Supabase identity access, `lib/persistence` owns bounded database calls, and `lib/domain` owns provider-independent contracts and the canonical journey catalog.

The private `wayfound` schema owns durable state. Privileged mutations are scoped transactions behind invoker RPC wrappers; no direct client table writes or application service keys are permitted. Reads verify the current provider session and the exact owner-membership or specialist-assignment authorization required for the resource. AI is not connected to persisted authority.

The create/list/open/resume slice is **Validated** at application commit `603f02862ae4090bd1853157e449a01508186f4c` through CI run 70. See [validation/increment-2-durable-workspace.md](validation/increment-2-durable-workspace.md).

The owner-authorized decision slice is **Validated** at application commit `548f1bbb4264ca412bc808a94a60593bca2c3602` through CI run 92. It records only product-scope and business decisions after explicit owner-authority confirmation. See [validation/increment-2-decisions.md](validation/increment-2-decisions.md).

The proposed-work-item slice is **Validated** at application commit `1f2a1c99856119c845a4495b61674bea415a4a77` through CI run 113. It records owner-owned bounded planned work with status `Proposed`, explicit completion conditions, and expected evidence, without implying execution or verification. See [validation/increment-2-work-items.md](validation/increment-2-work-items.md).

The owner-approved product-requirement slice is **Validated** at application commit `9e2af6940ce4d440fed00825620e0b693eff17c2` through CI run 131. It records only owner-authorized product requirements with one durable acceptance criterion and keeps that criterion distinct from verification evidence. See [validation/increment-2-requirements.md](validation/increment-2-requirements.md).

The criterion-evidence slice is **Validated** at application commit `4f67d99078600735f086ae894017481234a5a109` through CI run 151. It records durable owner-entered evidence results directly against an acceptance criterion, snapshots the linked requirement and criterion revisions, and preserves `Approved` requirement state without creating a verification state. See [validation/increment-2-evidence.md](validation/increment-2-evidence.md).

The durable proposed-artifact slice is **Validated** at application commit `8d36adede6c4b5c5570b7a3e37a519588124500b` through CI run 157. It creates a stable artifact identity and version 1 with lifecycle `Proposed`, stores an external reference without fetching it, and does not create accepted project direction. See [validation/increment-2-artifacts.md](validation/increment-2-artifacts.md).

The owner artifact-acceptance slice is **Validated** at repository head `3ca0ea4a1fe931e80a9466250915efe623827847` through CI run 164. It requires explicit product-owner authority to select the exact proposed version as accepted project direction, records the accepted-version pointer and acceptance metadata, preserves the no-fetch external-reference boundary, and does not imply specialist review or verification. See [validation/increment-2-artifact-acceptance.md](validation/increment-2-artifact-acceptance.md).

The assignment-scoped specialist artifact-review slice is **Validated** at application head `fc91a4377e887cada269fb35b2192f5c3efad15b` through CI run 172. It gives authenticated specialists a stable reviewer code without workspace membership, lets the owner assign one specialist to one exact accepted artifact version, records named qualified judgment with revision snapshots, proves that the specialist cannot execute owner mutations, and preserves the boundary between specialist review and verification. See [validation/increment-2-specialist-review.md](validation/increment-2-specialist-review.md).

No hosted project or production deployment exists. Broader Increment 2 remains In progress for work-state transitions and assignment, collaborator administration and broader durable record links, technical-decision/requirement specialist review, multiple criterion lifecycle, evidence freshness and verification lifecycle, maintenance, and later lifecycle/change-impact behavior. Later artifact-version, accepted-version replacement/supersession, and file-import behavior are assigned to Increment 3.


## 12. Owner work lifecycle extension

**Status:** In progress; complete validation pending.

[Owner work lifecycle](INCREMENT_2_WORK_LIFECYCLE.md) extends the durable work record with Proposed → Approved → In progress, In progress → Blocked, and Blocked → In progress. The owner must have current explicit owner membership and must own the target work item. Approval accepts planned work within owner authority only. It does not approve consequential technical choices or establish specialist review, completion, verification, or release authority.

The private transition command locks membership and the work row, checks the expected revision, and atomically records state/revision, immutable transition history, audit event, and request result. Exact duplicate replay returns its original transition ID after live authorization; changed payload or stale distinct requests fail. Owner reads include ordered history. UI controls expose only the allowed next action, require a reason/confirmation, and preserve entered details after an error.

No membership role or specialist authority changes. The migration preserves existing Proposed records. Because the earlier reader described every work item as Proposed, recovery must retain a state-aware reader; do not restore the old status constraint or drop history after transitions exist. Completion, assignment, dependencies, and technical acceptance remain later scope.
