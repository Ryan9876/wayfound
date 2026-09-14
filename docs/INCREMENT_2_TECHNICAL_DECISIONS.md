# Increment 2 — Consequential technical decision review and acceptance

**Status:** Validated  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002, ADR-0003, and accepted ADR-0004  
**Implementation state:** Implemented and validated at application head `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b`, CI run 201

## 1. Outcome

Wayfound lets a current workspace owner record a consequential technical choice as a proposed record, obtain qualified specialist review of the exact proposal revision, and separately accept that reviewed choice as project direction only when the required review conclusion is `No blocking finding`.

The specialist review does not automatically approve project direction. The owner acceptance action does not claim independent technical verification.

## 2. Requirement coverage

This slice advances:

- `WF-OWN-001` — product-owner decisions remain distinct from work that requires qualified specialist review;
- `WF-REC-001` — consequential technical choices and their review/acceptance history are durable project records;
- `WF-REC-002` — review, acceptance, verification, validation, and release remain separate states.

It does not complete those requirements for every later lifecycle.

## 3. Authority boundary

### Owner proposal

Only an authenticated current workspace owner may record a technical choice proposal in this bounded slice.

A technical choice proposal is not a `decision` under the approved glossary because it is not yet approved project direction.

The proposal records:

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

The action requires explicit confirmation that the owner is proposing a consequential technical choice for qualified review and is not accepting it as project direction.

### Specialist review

The owner assigns an authenticated specialist reviewer by stable reviewer code without granting workspace membership.

The assignment binds to:

- exact workspace;
- exact technical choice proposal;
- exact proposal revision;
- assigned reviewer actor;
- requested competence area;
- bounded review question.

Only the assigned live specialist may submit the review.

The specialist records reviewer display name, competence statement, conclusion, summary, findings, and explicit competence confirmation.

Allowed conclusions are:

- `No blocking finding`;
- `Changes required`;
- `Advisory`.

### Owner acceptance

Only an authenticated current workspace owner may accept a technical choice proposal as project direction.

Acceptance requires all of these conditions:

1. the proposal still exists in the same workspace and remains `Proposed`;
2. the caller still has explicit current owner membership;
3. the exact current proposal revision equals the reviewed proposal revision;
4. the required assignment is complete;
5. the completed review belongs to the assigned live specialist identity recorded by the system;
6. the completed review conclusion is `No blocking finding`;
7. the owner explicitly confirms that they accept the reviewed technical choice as project direction and do not claim independent technical verification.

The acceptance transaction establishes an `Accepted` technical decision that links the exact proposal and qualifying specialist review.

The acceptance record includes:

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

`No blocking finding` does not itself create the accepted technical decision.

## 4. Blocking and stale-review rules

`Changes required` blocks owner acceptance of the exact reviewed proposal revision.

`Advisory` does not satisfy the acceptance gate.

The bounded owner action provides no override for either result.

If material proposal content changes after a qualifying review, the proposal revision changes and the earlier review becomes ineligible for acceptance. The changed revision requires a new specialist review.

A material change to an already accepted technical decision does not overwrite that accepted record. It must enter a future replacement flow as a new proposed technical choice and repeat specialist review and owner acceptance. Accepted-decision replacement, supersession, and dependency impact remain excluded from this slice.

## 5. Data and security boundary

The implementation preserves the current security architecture:

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

Specialists are not added to the existing workspace membership table by this slice. Existing owner mutations still require a separately approved role-aware authorization redesign before membership roles can safely widen.

## 6. Transaction and idempotency rules

Proposal creation, specialist assignment, specialist review submission, and owner acceptance are transactional and idempotent by authenticated actor plus request UUID.

For every protected mutation:

- identical request UUID and identical normalized payload return the original result;
- changed reuse of the request UUID fails;
- current authorization is checked before a prior result is returned;
- injected audit failure rolls back the mutation and request-result record;
- a database interruption produces a recoverable error and does not substitute fixture state.

Owner acceptance locks the proposal and qualifying review context before checking eligibility. Concurrent distinct acceptance requests against the same proposal state produce one durable winner.

## 7. Presentation

The owner workspace shows technical choice proposals separately from accepted owner-only product/business decisions until acceptance occurs.

The proposal view shows in text:

- `Proposed` state;
- requested competence;
- bounded review question;
- assigned reviewer identity when assigned;
- specialist conclusion when complete;
- whether the proposal is eligible for owner acceptance;
- a clear explanation that specialist review is qualified judgment and owner acceptance is project-direction acceptance.

The owner acceptance control appears only when the exact current revision has `No blocking finding`.

The specialist workspace exposes only the assigned bounded proposal context required for review. It does not expose general workspace membership or unrelated durable records.

Important state and conclusion appear in text and do not rely on color alone. Controls are keyboard reachable and usable at desktop and 390 px mobile widths.

## 8. Failure behavior

The UI shows a recoverable error when:

- the database is unavailable;
- the proposal revision is stale;
- the assignment is no longer authorized;
- the specialist session is invalid or revoked;
- owner membership is revoked;
- the review result does not permit acceptance;
- another concurrent request already changed the eligible state.

A failed proposal, review, or acceptance operation does not partially change accepted project direction.

The current slice does not fetch or execute external references.

## 9. Executed acceptance criteria

The focused acceptance suite and full prior durable regression chain executed the bounded criteria below at application head `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b` in CI run 201.

1. Owner A can create one technical choice proposal and see it remain `Proposed` after restart and re-login.
2. Proposal creation alone creates no accepted decision and does not change existing owner decisions, requirements, artifacts, specialist reviews, work state, release state, verification, validation, or release authorization.
3. Owner A can assign Specialist S by reviewer code to the exact proposal revision without creating specialist workspace membership.
4. Unknown reviewer, owner self-review, cross-workspace target, unknown proposal, and stale proposal revision are rejected.
5. Only Specialist S can read the assignment and submit its review from a live authenticated session.
6. Specialist S can record each allowed conclusion in isolated test cases; only `No blocking finding` makes the exact proposal revision eligible for owner acceptance.
7. `Changes required` blocks acceptance. `Advisory` does not satisfy acceptance. There is no owner override in this slice.
8. A `No blocking finding` review does not itself create an accepted technical decision.
9. Only a current owner can perform the separate acceptance action after the qualifying exact-revision review.
10. The accepted technical decision records stable proposal, assignment, review, reviewer, accepting owner, time, and revision linkage.
11. Changing the proposal revision after review makes the older review ineligible and prevents acceptance until a new exact-revision qualifying review exists.
12. Another workspace owner or assigned specialist cannot use the action to accept the proposal as project direction.
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

Technical requirement specialist review should be specified next and should reuse the same split between qualified review and project-direction acceptance where applicable.

## 11. Validation evidence

The application behavior is **Validated** at `bb77ce1abba4ebe5a32bfbc32583e3ddbecd792b` through [CI run 201](https://github.com/Ryan9876/wayfound/actions/runs/34790448518).

Run 201 passed TypeScript, production build, prototype/accessibility/keyboard checks, the full durable regression chain, Supabase security advisor (`No issues found`), and the focused technical-decision authority suite.

The final `workspace-screenshots` artifact is ID `10328410866`, digest `sha256:4cee0ee67f15a6e51b9d587ff3c4795e5633c3ca49e863aa613e07bb519c845b`, size 21,499,822 bytes. The downloaded ZIP digest matched GitHub. Proposal, specialist-review, owner-acceptance, and database-unavailable screenshots were inspected at desktop and 390 px mobile widths.

See [validation/increment-2-technical-decisions.md](validation/increment-2-technical-decisions.md) for the executed evidence and limits. Increment 2 remains **In progress**. PR #1 remains open, draft, unmerged, and not Released.
