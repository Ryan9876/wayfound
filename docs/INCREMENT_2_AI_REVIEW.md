# Increment 2 — Durable AI review of implemented work

**Status:** Approved for implementation

**Parent:** Increment 2 — Durable single-owner workspace record

**Architecture basis:** Accepted ADR-0002 and ADR-0005

## Outcome

The authenticated workspace owner can request bounded local-AI review of one exact `Implemented` work-item revision, preserve the AI source/model and input boundary with the generated advisory result, and then record an explicit owner disposition without changing the reviewed work or any verification state.

This slice implements the next active Increment 2 item in `DELIVERY_PLAN.md` and advances `WF-AI-001`, `WF-AI-002`, `WF-OWN-001`, `WF-REC-001`, and `WF-REC-002`.

## Bounded target

The first durable AI-review target is one owner-owned work item whose current state is `Implemented`.

The review is bound to the exact work-item revision selected when the owner starts the request. Wayfound snapshots only the durable work record needed for the review:

- work-item ID;
- target revision;
- stage number;
- title;
- intended outcome;
- completion condition;
- expected evidence;
- current status;
- latest implementation transition note when present.

The snapshot is the AI input boundary. Wayfound does not claim that the model inspected source code, files, external URLs, tests, systems, or evidence that is not inside that snapshot.

Review of proposed, approved, in-progress, or blocked work remains outside this slice.

## Local AI execution

Use the local-first provider boundary from ADR-0005 and `INCREMENT_2_LOCAL_AI_CONNECTION.md`.

Wayfound may invoke only the supported loopback runtimes selected by the existing discovery rule:

- LM Studio on `127.0.0.1:1234`;
- Ollama on `127.0.0.1:11434`.

No public or cloud provider fallback is allowed.

The owner supplies one bounded review purpose. Wayfound constructs the review prompt from that purpose plus the stored target snapshot. The system instruction must tell the model to:

- review only the supplied record;
- distinguish observations from assumptions;
- identify material gaps, risks, or unclear completion claims;
- suggest the next useful action when appropriate;
- avoid claims that code, files, systems, tests, or evidence were inspected when they were not supplied;
- avoid labeling the target `Verified`, `Validated`, `Released`, safe, secure, correct, or production-ready.

The result is advisory text only. Hidden reasoning text is not stored.

## Durable provenance

A durable AI-review record contains at least:

- stable review ID;
- workspace, release, and stage;
- requesting owner actor;
- request time;
- target kind `work_item`;
- target work-item ID and exact revision;
- stored target snapshot;
- requested review purpose;
- context-boundary label;
- provider ID and provider label;
- model identity returned or selected by the provider;
- generated advisory result;
- provider-reported token/performance metrics when available;
- review status;
- completion or failure time;
- bounded failure detail when the local inference attempt fails;
- owner disposition and disposition note when recorded;
- disposition actor and time;
- audit history.

Provider metrics are descriptive provenance only. Missing provider metrics remain `null`; Wayfound must not invent them.

## Request lifecycle

The durable review lifecycle in this slice is:

`Pending` → `Completed`

or

`Pending` → `Failed`

The review request is created before inference. That transaction verifies the live owner, exact target, target revision, and `Implemented` state and stores the immutable target snapshot and purpose.

After local inference:

- success completes the same review with provider/model provenance and the advisory result;
- failure marks the same review `Failed` with bounded diagnostic detail;
- neither outcome changes the work item or any other project record.

A completed or failed review is terminal in this slice. Retry creates a new review request so earlier provenance remains intact.

## Owner disposition

Only a `Completed` AI review can receive an owner disposition. The current owner records exactly one of:

- `Use as input` — the owner intends to use the advisory result as input to later planning or decisions;
- `Needs follow-up` — the owner considers the result unresolved and wants further investigation or evidence;
- `Do not use` — the owner does not intend to use the advisory result.

The disposition requires a non-empty owner note and explicit confirmation.

A disposition records how the owner treats the AI advice. It does not automatically:

- edit or transition the work item;
- approve a requirement;
- accept a decision or artifact;
- create verification evidence;
- mark a criterion satisfied;
- complete or reopen a stage;
- validate a release;
- authorize deployment or another production-changing action.

Disposition is terminal for this bounded slice. Changing or superseding a disposition remains later scope.

## Authority and security

The authenticated actor must have current explicit `owner` membership and must equal the stored work-item owner when requesting review.

The request and disposition commands derive actor, release, stage, and target data from the live session and durable database state. Caller-supplied actor, release, stage, provider URL, model URL, authority, target snapshot, or AI result is not accepted as authority data.

The browser must not choose an arbitrary model endpoint. Local AI targets remain fixed loopback addresses selected by server-side discovery.

Direct protected-table writes remain denied. AI has no database credential, approval role, verification authority, release authority, or production-changing authority.

## Persistence, idempotency, and failure behavior

Review request creation is transactional and idempotent by owner/request UUID and normalized request payload. Identical replay returns the original review ID. Changed payload conflicts.

The exact work-item revision is checked before the review request is created. If the target changed, is not `Implemented`, belongs to another workspace, or is not owned by the current owner, the request fails without creating a review.

Completion/failure updates apply only to the exact pending review created for the current owner. A completed or failed review cannot be completed again with different output.

Owner disposition is transactional and idempotent by request UUID. Concurrent distinct dispositions for the same completed review produce one winner. An audit failure rolls back the disposition and request result.

If local inference fails after the review request exists, the review becomes `Failed`; existing project state remains unchanged. Database interruption must not substitute fixture state or claim that an unconfirmed durable write did not commit.

## User interface

For each `Implemented` work item:

- show an `AI review` section under the work record;
- show `Ask local AI to review` only when a supported local model is available;
- ask for a plain-language review purpose before starting the request;
- make clear that Wayfound sends only the displayed work-record context, not code or external evidence;
- show pending state while inference runs;
- show each durable review with explicit `AI review` labeling, status, purpose, model/provider, target revision, generated result, and date;
- show `This is advisory AI analysis, not verification.` on completed reviews;
- show failed reviews without presenting them as project findings;
- allow one owner disposition for completed reviews that have no disposition;
- show the saved disposition and owner note after recording it.

The UI must use text for review and disposition status and must remain usable at desktop and 390 px mobile widths.

## Acceptance criteria

1. A current authenticated owner can request AI review only for their exact current `Implemented` work revision with a non-empty purpose and explicit confirmation.
2. Review request creation stores a stable review ID, exact target revision, durable target snapshot, owner, release/stage context, purpose, context-boundary label, and `Pending` state before model execution.
3. With a supported local model available, Wayfound invokes only the selected loopback provider and records provider/model provenance and bounded advisory output on the same review.
4. The saved AI review does not claim to have inspected code, files, external URLs, systems, tests, or evidence outside the stored snapshot.
5. Local inference failure produces a durable `Failed` review with bounded failure detail and leaves work, requirements, decisions, artifacts, evidence, stages, and release state unchanged.
6. No local provider causes a clear unavailable result and no cloud/public fallback. The workspace remains usable.
7. Proposed, Approved, In progress, Blocked, stale-revision, unknown-target, cross-workspace, other-owner, revoked-session, and revoked-membership review requests fail without an AI-review record.
8. Identical review-request replay returns the original review ID; changed payload conflicts.
9. A completed review displays AI provenance and advisory output separately from objective evidence and human-authority records.
10. The current owner can record exactly one of `Use as input`, `Needs follow-up`, or `Do not use` with a note and explicit confirmation on a completed review.
11. Disposition does not mutate the target work item or any requirement, decision, artifact, evidence, criterion, stage, release, validation, or production authorization state.
12. Invalid, unauthorized, failed-review, duplicate, stale, changed-payload, revoked-session, revoked-membership, and concurrent distinct disposition paths fail without partial state. Concurrent distinct dispositions produce one winner.
13. Injected audit failure rolls back the full disposition mutation and its idempotent request result.
14. Restart and re-login preserve the review snapshot, provenance, output/failure state, and disposition history.
15. TypeScript, production build, security advisor, prior durable regressions, local-AI boundary checks, focused AI-review persistence/security tests, keyboard checks, responsive screenshots, and active single-user UI validation pass on the identified build.
16. A validation record identifies application commit, CI run, executed evidence, screenshots, limits, and remaining scope. No `Validated` claim is made until all required checks pass.

## Migration and recovery

Use an additive migration. Do not modify or relabel historical human specialist-review records as AI review.

Application rollback may leave durable AI-review rows unreadable by older code. During rollback, disable AI-review mutations and retain the database rows. Prefer a forward fix over destructive data rollback.

## Exclusions

This slice does not implement AI review of requirements, decisions, artifacts, source code, imported files, external URLs, repositories, or verification evidence. It does not implement cloud-provider configuration, autonomous AI actions, AI-created project-direction records, changed/superseded dispositions, model comparison, multi-model consensus, automatic stale-review impact handling, verification decisions, stage completion, release readiness, deployment, or production-changing actions.
