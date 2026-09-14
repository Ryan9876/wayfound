# Increment 2 — Consequential technical requirement review and approval

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002, ADR-0003, and accepted ADR-0004  
**Implementation state:** Specification defined; implementation next

## 1. Outcome

Wayfound will let a current workspace owner record a consequential technical requirement proposal with one acceptance criterion, obtain qualified specialist review of the exact proposal revision, and separately approve that reviewed proposal as an approved technical requirement only when the required review conclusion is `No blocking finding`.

The specialist review will not automatically approve the requirement. The owner approval action will not claim independent technical verification.

The approved result will enter the canonical durable requirement record so later criterion evidence and traceability can use the same requirement-to-criterion model as owner-approved product requirements.

## 2. Requirement coverage

This slice advances:

- `WF-OWN-001` — product-owner decisions remain distinct from work that requires qualified specialist review;
- `WF-REC-001` — consequential technical requirements and their review/approval history become durable project records;
- `WF-REC-002` — approval, review, verification, validation, and release remain separate states.

The first-version charter also requires structured requirement records, named reviewer records, and requirement-to-acceptance-criterion-to-evidence links. This slice establishes the approved technical requirement and criterion boundary. It does not add verification evidence or later requirement lifecycle behavior.

## 3. Terminology and authority

The approved glossary defines a `requirement` as an approved statement of required product or system behavior. Therefore, a technical statement that is waiting for qualified review is a **technical requirement proposal**, not a requirement.

ADR-0004 establishes the governing split-authority principle:

1. the owner records proposed technical direction;
2. an assigned authenticated specialist reviews the exact revision within a declared competence and bounded question;
3. only `No blocking finding` makes that exact revision eligible for owner acceptance of project direction;
4. the owner performs a separate explicit action;
5. specialist review does not establish verification, validation, release readiness, or production authorization.

For technical requirements, the final owner action is called **approval** because the canonical requirement state is `Approved`.

### Owner proposal authority

Only an authenticated current workspace owner may create or revise a technical requirement proposal in this bounded slice.

A proposal must contain:

- immutable proposal identifier;
- workspace identifier;
- release identifier and current stage captured from durable state;
- title;
- obligation `MUST`, `SHOULD`, or `MAY`;
- proposed technical requirement statement;
- one proposed acceptance criterion;
- requested competence area;
- one bounded review question;
- proposal status `Proposed`;
- revision;
- proposing owner actor derived from the live session;
- created and updated timestamps.

The proposal action must require explicit confirmation that the owner is proposing consequential technical behavior for qualified review and is not approving it as a requirement.

### Specialist review authority

The owner assigns an authenticated specialist by stable reviewer code without granting workspace membership.

The assignment binds to the exact proposal revision and snapshots all content that the specialist is asked to review, including:

- title;
- obligation;
- proposed technical requirement statement;
- proposed acceptance criterion;
- requested competence area;
- bounded review question.

Only the assigned live specialist may submit the review.

The specialist records reviewer display name, competence statement, conclusion, summary, findings, and explicit competence confirmation.

Allowed conclusions are:

- `No blocking finding`;
- `Changes required`;
- `Advisory`.

### Owner approval authority

Only an authenticated current workspace owner may approve a technical requirement proposal.

Approval requires all of these conditions at transaction time:

1. the proposal remains `Proposed`;
2. the caller still has explicit current owner membership;
3. the current proposal revision equals the reviewed revision;
4. the required assignment is complete;
5. the completed review belongs to the assigned authenticated specialist recorded by the system;
6. the completed review conclusion is `No blocking finding`;
7. the owner explicitly confirms that they approve the reviewed technical requirement as project direction and do not claim independent technical verification.

Approval creates one canonical durable requirement with:

- kind `technical`;
- authority `owner-after-specialist-review`;
- status `Approved`;
- the proposal title, obligation, and technical requirement statement;
- one canonical acceptance criterion copied from the exact reviewed proposal revision;
- current release and captured stage;
- approving owner actor;
- revision 1.

The approval transaction also creates durable governance linkage from the approved requirement to the exact proposal, assignment, review, reviewer, proposal revision, approving owner, and approval time.

`No blocking finding` must not itself create the approved requirement.

## 4. Blocking and stale-review rules

`Changes required` blocks owner approval of the exact reviewed proposal revision.

`Advisory` does not satisfy the approval gate.

The bounded owner action provides no override for either result.

Any material change to the title, obligation, technical requirement statement, acceptance criterion, requested competence, or bounded review question increments the proposal revision. An earlier review then becomes ineligible for approval. The changed revision requires a new specialist review.

A material change to an already approved technical requirement must not overwrite that approved requirement in this slice. The change must enter as a new technical requirement proposal and repeat qualified review and owner approval. Requirement replacement, supersession, deprecation, and impact analysis remain future scope.

## 5. Canonical requirement integration

Approved technical requirements must use the existing `wayfound.requirements` and `wayfound.acceptance_criteria` records so downstream requirement listing and evidence linkage do not fork into a separate requirement model.

The current owner-only creation command remains restricted to:

- kind `product`;
- authority `owner`;
- status `Approved`.

It must not gain a caller-controlled kind or authority parameter.

The technical requirement approval transaction is a separate protected command. It is the only new path in this slice that may create:

- kind `technical`;
- authority `owner-after-specialist-review`;
- status `Approved`.

Existing product requirements remain unchanged.

## 6. Persistence and security boundary

Preserve the current security architecture:

- private `wayfound` PostgreSQL schema;
- row-level security as defense in depth;
- no direct client table writes for protected durable state;
- no application service key;
- public `SECURITY INVOKER` RPC wrappers only;
- narrow private `SECURITY DEFINER` transaction functions with `search_path = ''` and fully qualified object names;
- live-session authentication through authoritative provider/session state;
- exact resource authorization from durable state;
- no caller-supplied actor, owner, reviewer, release, stage, kind, authority, or approval identity used as trusted authority;
- bounded retry only for exact `PGRST303` with message `JWT issued at future`.

Do not add specialists to the existing workspace membership table in this slice. Reuse the established stable reviewer-code identity and assignment-scoped authorization model.

The bounded implementation may use separate technical-requirement proposal, assignment, review, approval-link, and idempotent-request tables rather than generalizing the existing technical-choice tables. This keeps the change explicit and avoids a polymorphic authorization refactor inside this slice.

## 7. Transaction and idempotency rules

Proposal creation, proposal revision, specialist assignment, specialist review submission, and owner approval must each be transactional and idempotent by authenticated actor plus request UUID.

For every protected mutation:

- identical request UUID and identical normalized payload return the original result;
- changed reuse of the request UUID fails;
- current authorization is checked before a prior result is returned;
- injected audit failure rolls back the mutation and request-result record;
- a database interruption produces a recoverable error and does not substitute fixture state.

Owner approval must lock the proposal and qualifying review context before checking eligibility. Concurrent distinct approval requests against the same proposal state must produce one durable approved requirement.

The approved requirement, initial acceptance criterion, technical approval linkage, proposal status change, audit event, and request result must commit atomically.

## 8. Presentation

The owner workspace must keep technical requirement proposals separate from already approved requirements until owner approval occurs.

The technical requirement proposal view must show in text:

- `Proposed` state;
- obligation;
- proposed technical requirement statement;
- proposed acceptance criterion;
- requested competence;
- bounded review question;
- assigned reviewer identity when assigned;
- specialist conclusion when complete;
- whether the exact proposal revision is eligible for owner approval;
- a clear explanation that specialist review is qualified judgment and owner approval establishes project direction.

The owner approval control appears only when the exact current revision has `No blocking finding`.

After approval, the canonical Requirements section must show the approved record as:

- kind `technical`;
- authority `owner-after-specialist-review`;
- status `Approved`;
- linked acceptance criterion;
- clear text that approval does not establish verification.

The specialist workspace exposes only the assigned bounded technical requirement proposal context required for review. It must not expose general workspace membership or unrelated durable records.

Important state and conclusion must appear in text and must not rely on color alone. Controls must be keyboard reachable and usable at desktop and 390 px mobile widths.

## 9. Failure behavior

The UI must show a recoverable error when:

- the database is unavailable;
- the proposal revision is stale;
- the assignment is no longer authorized;
- the specialist session is invalid or revoked;
- owner membership is revoked;
- the review result does not permit approval;
- another concurrent request already changed the eligible state.

A failed proposal, review, or approval operation must not partially create an approved requirement, acceptance criterion, approval linkage, audit event, or request result.

## 10. Acceptance criteria

The slice is Validated only when executed evidence proves all applicable criteria below.

1. Owner A can create one technical requirement proposal and see it remain `Proposed` after restart and re-login.
2. Proposal creation alone creates no approved requirement or acceptance criterion and does not alter existing product requirements, technical decisions, work, evidence, artifacts, release state, verification, validation, or release authorization.
3. The proposal contains one obligation and one proposed acceptance criterion that are part of the reviewed revision.
4. Owner A can assign Specialist S by reviewer code to the exact proposal revision without creating specialist workspace membership.
5. Unknown reviewer, owner self-review, cross-workspace target, unknown proposal, and stale proposal revision are rejected.
6. Only Specialist S can read the assignment and submit its review from a live authenticated session.
7. Specialist S can record each allowed conclusion in isolated test cases; only `No blocking finding` makes the exact proposal revision eligible for owner approval.
8. `Changes required` blocks approval. `Advisory` does not satisfy approval. There is no owner override in this slice.
9. A `No blocking finding` review does not itself create an approved requirement.
10. Only a current owner can perform the separate approval action after the qualifying exact-revision review.
11. Approval creates exactly one canonical requirement with kind `technical`, authority `owner-after-specialist-review`, status `Approved`, the reviewed obligation/statement, and exactly one canonical acceptance criterion containing the reviewed criterion statement.
12. The technical approval linkage records stable proposal, proposal revision, assignment, review, reviewer, approving owner, approval time, and approved requirement identifiers.
13. Changing any material proposal content, including the proposed acceptance criterion, after review makes the older review ineligible and prevents approval until a new exact-revision qualifying review exists.
14. Another workspace owner or the assigned specialist cannot use the action to approve the proposal unless the governing authority model explicitly grants that role.
15. Anonymous, expired, signed-out, revoked-session, revoked-assignment, and revoked-membership requests fail for the protected operations that require them.
16. Direct private-table read/write remains denied.
17. Identical concurrent retries return one original result; changed request reuse fails; concurrent distinct approval requests produce one winner.
18. Injected audit failure rolls back each protected mutation and its idempotent request result.
19. Restart/re-login preserves proposal, assignment, review, approved requirement, criterion, technical approval linkage, and history.
20. Database interruption produces a recoverable error. Recovery restores committed records without fixture substitution.
21. The existing owner requirement command still creates only product requirements under owner authority and cannot be used to create technical requirements.
22. Existing durable slices remain unchanged under the full regression chain, including technical-decision authority.
23. Supabase security advisor reports no issues introduced by the change.
24. TypeScript and production build pass.
25. Keyboard checks and desktop/390 px rendered inspection pass with important states shown in text.
26. Validation records the exact application commit, CI run, screenshot artifact IDs/digests, executed checks, and remaining limits.
27. PR #1 remains open, draft, unmerged, and not Released.

## 11. Excluded behavior

This bounded slice does not implement:

- owner-only approval of consequential technical requirements;
- broad collaborator or specialist workspace membership;
- public invitations or account discovery;
- owner override of `Changes required` or `Advisory`;
- multiple mandatory specialist disciplines for one proposal;
- formal review disputes or waivers;
- editing an approved technical requirement in place;
- requirement replacement, withdrawal, supersession, or deprecation;
- multiple acceptance criteria per requirement;
- criterion pass/fail state;
- requirement-to-work or requirement-to-decision links;
- evidence freshness or explicit verification decisions;
- automated verification;
- release authorization or production-changing actions.

## 12. Implementation sequence

Implement in this order:

1. domain contracts and validation;
2. private PostgreSQL proposal/review/approval model plus safe extension of canonical requirement constraints;
3. persistence adapters;
4. application services;
5. owner and specialist server actions;
6. owner and specialist UI;
7. focused technical-requirement regression suite and CI integration;
8. rendered inspection and repository reconciliation.

No new ADR is required for this bounded slice because accepted ADR-0004 already establishes the trust and authority rule. Create a new ADR only if implementation requires a different final authority, broader membership, multiple mandatory reviewers, an override path, or another material trust-boundary change.
