# Increment 2 — Consequential technical decision review and acceptance

**Status:** Blocked — ADR-0004 owner approval required  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and ADR-0003; proposed ADR-0004  
**Implementation state:** Not started

## 1. Outcome

After ADR-0004 is accepted, Wayfound will let a current workspace owner record a consequential technical choice as a proposed record, obtain qualified specialist review of the exact proposal revision, and separately accept that reviewed choice as project direction only when the required review conclusion is `No blocking finding`.

The specialist review will not automatically approve project direction. The owner acceptance action will not claim independent technical verification.

This slice is blocked until the project owner accepts or changes ADR-0004.

## 2. Requirement coverage

This slice is intended to advance:

- `WF-OWN-001` — product-owner decisions remain distinct from work that requires qualified specialist review;
- `WF-REC-001` — consequential technical choices and their review/acceptance history become durable project records;
- `WF-REC-002` — review, acceptance, verification, validation, and release remain separate states.

It does not complete those requirements for every later lifecycle.

## 3. Authority boundary

### Owner proposal

Only an authenticated current workspace owner may record a technical choice proposal in this bounded slice.

A technical choice proposal is not a `decision` under the approved glossary because it is not yet approved project direction.

The proposal must record:

- immutable proposal identifier;
- workspace identifier;
- release identifier and current stage captured from durable state;
- title;
- technical choice statement;
- rationale;
- alternatives considered;
- known material constraints or consequences;
- requested competence area;
- one bounded review question;
- proposal status `Proposed`;
- revision;
- proposing owner actor derived from the live session;
- created and updated timestamps.

The action must require explicit confirmation that the owner is proposing a consequential technical choice for qualified review and is not accepting it as project direction.

### Specialist review

The owner must assign an authenticated specialist reviewer by stable reviewer code without granting workspace membership.

The assignment must bind to:

- exact workspace;
- exact technical choice proposal;
- exact proposal revision;
- assigned reviewer actor;
- requested competence area;
- bounded review question.

Only the assigned live specialist may submit the review.

The specialist must record reviewer display name, competence statement, conclusion, summary, findings, and explicit competence confirmation.

Allowed conclusions remain:

- `No blocking finding`;
- `Changes required`;
- `Advisory`.

### Owner acceptance

Only an authenticated current workspace owner may accept a technical choice proposal as project direction.

Acceptance must require all of these conditions:

1. the proposal still exists in the same workspace and remains `Proposed`;
2. the caller still has explicit current owner membership;
3. the exact current proposal revision equals the reviewed proposal revision;
4. the required assignment is complete;
5. the completed review belongs to the assigned live specialist identity recorded by the system;
6. the completed review conclusion is `No blocking finding`;
7. the owner explicitly confirms that they accept the reviewed technical choice as project direction and do not claim independent technical verification.

The acceptance transaction must create or establish an `Accepted` technical decision that links the exact proposal and qualifying specialist review.

The acceptance record must include:

- immutable accepted technical-decision identifier;
- workspace, release, and captured stage;
- proposal identifier and proposal revision;
- specialist assignment identifier;
- specialist review identifier;
- reviewer actor identifier and review conclusion;
- accepting owner actor identifier;
- accepted time;
- accepted-decision revision;
- audit event identifier or traceable audit entry.

`No blocking finding` must not itself create the accepted technical decision.

## 4. Blocking and stale-review rules

`Changes required` blocks owner acceptance of the exact reviewed proposal revision.

`Advisory` does not satisfy the acceptance gate.

The bounded owner action must not provide an override for either result.

If any material proposal content changes after the qualifying review, the proposal revision must change and the earlier review must become ineligible for acceptance. The changed revision requires a new specialist review.

A material change to an already accepted technical decision must not overwrite that accepted record. It must enter a future replacement flow as a new proposed technical choice and repeat specialist review and owner acceptance. Accepted-decision replacement, supersession, and dependency impact are excluded from this slice.

## 5. Data and security boundary

Preserve the current security architecture:

- private `wayfound` PostgreSQL schema;
- row-level security as defense in depth;
- no direct client table writes for protected durable state;
- no application service key;
- public `SECURITY INVOKER` RPC wrappers only;
- narrow private `SECURITY DEFINER` transaction functions with `search_path = ''` and fully qualified object names;
- live-session authentication through authoritative provider/session state;
- exact resource authorization from durable state;
- no caller-supplied actor, owner, reviewer, release, stage, or acceptance authority used as trusted authority;
- bounded retry only for exact `PGRST303` with message `JWT issued at future`.

Do not add specialists to the existing workspace membership table in this slice. Existing owner mutations still require a separately approved role-aware authorization redesign before membership roles can safely widen.

## 6. Transaction and idempotency rules

Proposal creation, specialist assignment, specialist review submission, and owner acceptance must each be transactional and idempotent by authenticated actor plus request UUID.

For every protected mutation:

- identical request UUID and identical normalized payload return the original result;
- changed reuse of the request UUID fails;
- current authorization is checked before a prior result is returned;
- injected audit failure rolls back the mutation and request-result record;
- a database interruption produces a recoverable error and does not substitute fixture state.

Owner acceptance must lock the proposal and qualifying review context before checking eligibility. Concurrent distinct acceptance requests against the same proposal state must produce one durable winner.

## 7. Presentation

The owner workspace should show technical choice proposals separately from accepted owner-only product/business decisions until acceptance occurs.

The proposal view must show in text:

- `Proposed` state;
- requested competence;
- bounded review question;
- assigned reviewer identity when assigned;
- specialist conclusion when complete;
- whether the proposal is eligible for owner acceptance;
- a clear explanation that specialist review is qualified judgment and owner acceptance is project-direction acceptance.

The owner acceptance control must appear only when the exact current revision has `No blocking finding`.

The specialist workspace must expose only the assigned bounded proposal context required for review. It must not expose general workspace membership or unrelated durable records.

Important state and conclusion must appear in text and not rely on color alone. Controls must be keyboard reachable and usable at desktop and 390 px mobile widths.

## 8. Failure behavior

The UI must show a recoverable error when:

- the database is unavailable;
- the proposal revision is stale;
- the assignment is no longer authorized;
- the specialist session is invalid or revoked;
- owner membership is revoked;
- the review result does not permit acceptance;
- another concurrent request already changed the eligible state.

A failed proposal, review, or acceptance operation must not partially change accepted project direction.

The system must not fetch or execute an external reference if one is included as proposal reference data in a later implementation detail.

## 9. Proposed acceptance criteria

These criteria are not validation evidence. They define the behavior that must pass after ADR-0004 approval and implementation.

1. Owner A can create one technical choice proposal and see it remain `Proposed` after restart and re-login.
2. Proposal creation alone creates no accepted decision and does not change existing owner decisions, requirements, artifacts, specialist reviews, work state, release state, verification, validation, or release authorization.
3. Owner A can assign Specialist S by reviewer code to the exact proposal revision without creating specialist workspace membership.
4. Unknown reviewer, self-review if disallowed by the final ADR, cross-workspace target, unknown proposal, and stale proposal revision are rejected.
5. Only Specialist S can read the assignment and submit its review from a live authenticated session.
6. Specialist S can record each allowed conclusion in isolated test cases; only `No blocking finding` makes the exact proposal revision eligible for owner acceptance.
7. `Changes required` blocks acceptance. `Advisory` does not satisfy acceptance. There is no owner override in this slice.
8. A `No blocking finding` review does not itself create an accepted technical decision.
9. Only a current owner can perform the separate acceptance action after the qualifying exact-revision review.
10. The accepted technical decision records stable proposal, assignment, review, reviewer, accepting owner, time, and revision linkage.
11. Changing the proposal revision after review makes the older review ineligible and prevents acceptance until a new exact-revision qualifying review exists.
12. Another workspace owner or assigned specialist cannot use the action to accept the proposal as project direction unless the final accepted authority model explicitly grants that role.
13. Anonymous, expired, signed-out, revoked-session, revoked-assignment, and revoked-membership requests fail for the protected operations that require them.
14. Direct private-table read/write remains denied.
15. Identical concurrent retries return one original result; changed request reuse fails; concurrent distinct acceptance requests produce one winner.
16. Injected audit failure rolls back each protected mutation and its idempotent request result.
17. Restart/re-login preserves proposal, assignment, review, accepted-decision identity, and history.
18. Database interruption produces a recoverable error. Recovery restores committed records without fixture substitution.
19. Existing durable slices remain unchanged under the full regression chain, including the owner work lifecycle suite.
20. Supabase security advisor reports no issues introduced by the change.
21. TypeScript and production build pass.
22. Keyboard checks and desktop/390 px rendered inspection pass with important states shown in text.
23. Validation records the exact application commit, CI run, screenshot artifact IDs/digests, executed checks, and remaining limits.
24. PR #1 remains open, draft, unmerged, and not Released.

## 10. Excluded behavior

This bounded slice does not implement:

- technical requirement approval;
- broad collaborator or specialist workspace membership;
- public invitations or account discovery;
- owner override of `Changes required` or `Advisory`;
- multiple mandatory specialist disciplines for one proposal;
- formal review disputes or waivers;
- accepted technical-decision replacement or supersession;
- dependency impact analysis;
- verification decisions;
- artifact import or later artifact versions;
- release authorization or production-changing actions.

Technical requirement specialist review should be specified after this authority boundary is accepted because it should reuse the same split between qualified review and project-direction acceptance where applicable.

## 11. Approval needed

Implementation is blocked on one owner decision:

**Approve ADR-0004 Option A: an assigned specialist must record `No blocking finding` on the exact technical choice proposal revision, and the current workspace owner must then perform a separate explicit acceptance action before the choice becomes accepted project direction.**

If the owner does not approve this rule, ADR-0004 must be revised before implementation begins.
