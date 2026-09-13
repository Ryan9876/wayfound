# Increment 2 — Assignment-scoped specialist review

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and ADR-0003

## 1. Outcome

Wayfound MUST let a product owner request qualified review of the exact artifact version currently accepted as project direction, and MUST let only the assigned authenticated specialist record that review.

The review is a named record of qualified judgment within a declared competence area. It is not verification evidence, product-owner acceptance, release readiness, or production authorization.

## 2. Reviewer identity

An authenticated non-anonymous user MUST be able to establish a Wayfound actor identity and obtain a stable reviewer code.

The reviewer code:

- identifies the internal actor that can receive an assignment;
- MUST NOT create workspace membership;
- MUST NOT by itself authorize any read or mutation;
- MAY be shared with a product owner for assignment targeting.

Production invitation, public signup, email lookup, account recovery, and hosted account administration are excluded.

## 3. Owner assignment

Only the authenticated current workspace owner MAY create a specialist-review assignment.

The owner MUST select:

- the exact artifact identity;
- the exact artifact-version identity;
- a reviewer code that resolves to another actor;
- a requested competence area;
- one bounded review question;
- explicit confirmation that the request is a bounded specialist review and does not transfer product-owner authority.

The target artifact version MUST be the version currently accepted as project direction when the assignment is created. Proposed, unknown, cross-artifact, and cross-workspace targets MUST be rejected.

The owner MUST NOT assign themself as the specialist for this bounded slice.

## 4. Specialist access

A specialist MUST see only assignments addressed to the actor derived from their current live session.

An assignment MAY expose only the context needed for the bounded review:

- workspace name;
- artifact title and kind;
- exact artifact/version identifiers;
- version number and lifecycle;
- artifact summary;
- external-reference label and URL;
- requested competence;
- review question;
- assignment identifier and time.

An assignment MUST NOT make the specialist a general workspace member.

## 5. Specialist review record

Only the assigned specialist MAY submit a review for an incomplete assignment.

The specialist MUST record:

- reviewer display name;
- competence statement;
- conclusion;
- summary;
- findings;
- explicit confirmation that the review is within the specialist's declared competence.

Allowed conclusions are:

- `No blocking finding`;
- `Changes required`;
- `Advisory`.

A review MUST capture:

- immutable review ID;
- assignment ID;
- workspace, artifact, and artifact-version IDs;
- reviewer actor derived from the live session;
- artifact revision at review time;
- artifact-version revision at review time;
- reviewed time;
- review revision.

The same assignment MUST NOT receive more than one completed review.

## 6. State boundary

Recording a specialist review MUST NOT:

- change artifact or artifact-version lifecycle;
- change the accepted-version pointer;
- increment artifact or artifact-version revision;
- change any requirement from `Approved`;
- mark an acceptance criterion satisfied, passed, verified, or validated;
- modify criterion evidence;
- change release lifecycle or current stage;
- establish product-owner acceptance;
- establish release readiness or production authorization.

If the assigned artifact version is no longer the artifact's currently accepted version when the specialist submits, the review MUST be rejected as stale for this bounded flow.

## 7. Owner view

The owner MUST be able to see pending assignments and completed specialist reviews in the project workspace next to the reviewed accepted artifact.

A completed review MUST show:

- reviewer name;
- competence statement;
- conclusion in text;
- summary;
- findings;
- review time;
- artifact/version revision snapshots;
- stable assignment and review IDs;
- a clear warning that the review is not verification, validation, release readiness, or production authorization.

## 8. Security and transaction rules

Specialist-review tables MUST remain in the private `wayfound` schema with RLS enabled and direct client table grants revoked.

Protected functions MUST derive actor identity from `wayfound.subject()` and MUST evaluate the exact stored owner or assignment authorization required for the operation.

The application MUST NOT use a service key.

Owner assignment and specialist review submission MUST be transactional and idempotent by authenticated actor plus request UUID.

- identical retry returns the original result;
- changed reuse of the same request UUID fails;
- injected audit failure rolls back the mutation and request result;
- direct table writes cannot bypass assignment or review invariants.

The existing bounded retry applies only to exact PostgREST `PGRST303` with message `JWT issued at future`.

## 9. Failure behavior

If specialist-review persistence is unavailable, Wayfound MUST show a recoverable error and MUST NOT replace saved state with fixture data.

A failed assignment MUST leave artifact state unchanged.

A failed review submission MUST leave the assignment incomplete and MUST leave accepted artifact and release state unchanged.

## 10. Acceptance criteria

1. An authenticated non-anonymous specialist can obtain a stable reviewer code without receiving workspace membership.
2. An authenticated current owner can assign a different valid reviewer code to the exact currently accepted artifact version after confirming the bounded review authority statement.
3. Self-assignment by the workspace owner is rejected.
4. Unknown reviewer codes and unknown, proposed, cross-artifact, or cross-workspace artifact/version targets are rejected.
5. The assigned specialist can list the assignment; an unrelated authenticated user cannot see it.
6. The specialist cannot open/list the owner's workspace through existing workspace membership paths and cannot execute owner mutations for that workspace.
7. Only the assigned specialist can submit the review.
8. Review submission requires an explicit competence confirmation and accepts only the defined three conclusions.
9. The stored reviewer actor is derived from the current live session; reviewer name and competence statement are visible as the specialist's asserted review identity and scope.
10. Review submission snapshots current artifact and version revisions but leaves artifact/version lifecycle, accepted-version pointer, and revisions unchanged.
11. Release lifecycle/current stage, approved requirements, acceptance criteria, and existing evidence remain unchanged by the review.
12. The owner can see the pending assignment and completed named review next to the reviewed artifact.
13. An identical concurrent assignment retry creates one assignment; changed request reuse is rejected.
14. An identical concurrent review retry creates one review; changed request reuse is rejected.
15. A new request against an already completed assignment is rejected.
16. Anonymous, expired-session, signed-out, revoked-session, and revoked-assignment access cannot submit a protected review.
17. Direct client reads/writes of private specialist-review tables are denied.
18. An injected `specialist_review.assigned` or `specialist_review.recorded` audit failure rolls back the related mutation and request state.
19. Restart and re-login preserve assignment/review identity and content.
20. Database interruption renders a recoverable saved-record error; recovery restores the same committed state without fixture substitution.
21. Creating, assigning, listing, reviewing, restarting, and recovering generate zero requests to the stored external artifact reference.
22. Supabase security advisor, TypeScript, production build, prior durable suites, and the focused specialist-review suite pass.
23. Desktop and 390 px mobile rendered review shows reviewer identity, competence, conclusion, stable IDs, authority boundary, and no horizontal overflow.
24. All visible controls are keyboard reachable with visible focus, and important status/conclusion is text rather than color-only.

## 11. Excluded behavior

This slice does not implement:

- public signup or production invitations;
- specialist email search or account discovery;
- broad specialist workspace membership;
- reviewer reassignment, removal, or revocation UI;
- multiple specialists for the same artifact/version beyond distinct bounded assignments;
- specialist approval of technical requirements or technical decision records;
- review freshness or outdated-review calculation;
- verification decisions;
- later artifact versions, supersession, or file import;
- release authorization or production-changing actions.
