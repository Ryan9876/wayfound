# Increment 2 — Owner artifact acceptance

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable proposed-artifact boundary

## 1. Outcome

An authenticated workspace owner can explicitly accept one existing proposed artifact version as the artifact version currently accepted as project direction.

Acceptance is a project-direction action. It does not claim specialist review, technical correctness, verification, validation, release readiness, or production authorization.

## 2. Requirement coverage

This slice advances the approved artifact model in the Project Charter and Glossary by adding explicit accepted-version selection. It preserves the rule that proposed or imported work must not silently become accepted work.

It establishes the accepted-version boundary needed before Increment 3 adds later artifact versions and import behavior.

## 3. Acceptance semantics

The approved glossary defines:

- `accepted artifact` as the artifact version currently accepted as project direction;
- `proposed artifact` as a new or changed artifact version awaiting acceptance.

For this bounded slice:

- the artifact has at most one current `accepted_version_id`;
- the selected version changes from lifecycle `Proposed` to `Accepted`;
- the artifact records the accepting actor and acceptance time;
- the artifact revision and selected version revision increment;
- acceptance is explicit and version-specific;
- the external reference remains reference data and is not fetched or executed.

An acceptance action MUST NOT:

- accept an artifact or version from another workspace;
- accept a version that does not belong to the selected artifact;
- accept a version that is not currently `Proposed`;
- infer specialist review or technical approval;
- mark evidence as current, sufficient, verified, or validated;
- change release lifecycle or authorize release;
- fetch or execute referenced external content.

## 4. Authorization and authority

Only an authenticated current workspace owner can accept an artifact version in the current owner-only membership model.

The action requires explicit confirmation that the owner is accepting this version as project direction within product-owner authority. The interface must state that consequential technical decisions still require qualified specialist review.

The database derives the accepting actor from the verified session and current membership. The caller supplies only workspace, artifact, version, confirmation, and request key.

## 5. Durable state

The artifact record gains:

- nullable `accepted_version_id`;
- nullable `accepted_by_actor_id`;
- nullable `accepted_at`.

The artifact-version lifecycle expands from only `Proposed` to `Proposed | Accepted`.

The accepted-version pointer must reference a version in the same workspace and artifact.

This slice does not create a second artifact version, so it does not define supersession behavior for a previously accepted version. That behavior remains part of later-version lifecycle work.

## 6. Acceptance transaction

`AcceptArtifactVersion` takes workspace identifier, artifact identifier, version identifier, owner-authority confirmation, and request key.

One transaction:

1. verifies the current provider session;
2. verifies current owner membership;
3. validates identifiers and explicit authority confirmation;
4. serializes acceptance for the target artifact;
5. resolves the artifact and version from durable state;
6. rejects cross-workspace, cross-artifact, missing, or non-`Proposed` targets;
7. changes the selected version lifecycle to `Accepted` and increments its revision;
8. sets the artifact accepted-version pointer, accepting actor, and acceptance time and increments the artifact revision;
9. records `artifact.accepted` in the audit log with the accepted version as the entity;
10. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original accepted version identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves the artifact version `Proposed`, leaves the artifact without an accepted-version pointer, and leaves no partial acceptance audit or retry record.

## 7. Presentation

For a proposed artifact version, the workspace shows an explicit owner action to accept that exact version.

The action requires a checkbox that confirms:

- this version is being accepted as project direction under product-owner authority; and
- acceptance does not substitute for qualified specialist review where that review is required.

After acceptance, the workspace shows:

- lifecycle `Accepted` in text;
- `Accepted project direction` in text;
- accepted version number;
- accepting role as Product owner;
- acceptance time;
- stable artifact and version identifiers;
- the existing summary and external reference;
- explicit text that acceptance does not establish specialist review or verification.

The acceptance action is no longer offered for the accepted version.

## 8. Failure behavior

If acceptance fails, existing artifact state remains unchanged and the application shows a recoverable error.

A database interruption must not replace durable artifact state with fixtures or report acceptance that did not commit.

The existing bounded retry applies only to exact PostgREST `PGRST303: JWT issued at future`. Authorization and invalid-state failures remain failures.

## 9. Acceptance criteria

1. Owner A creates a proposed artifact version and accepts it through the application. The selected version changes to `Accepted`, and the artifact points to that version.
2. The database derives the accepting actor from the current verified owner session.
3. Acceptance requires explicit product-owner authority confirmation.
4. Unknown, cross-workspace, cross-artifact, or non-`Proposed` target versions are rejected.
5. The acceptance transaction increments artifact and version revisions and records accepting actor and time.
6. The rendered artifact shows `Accepted project direction` and does not imply specialist review, verification, validation, or release readiness.
7. The external reference remains unchanged and receives zero requests during create, accept, list, render, restart, and recovery.
8. Repeating the same acceptance request with identical input is idempotent. Reusing the request key with changed input is rejected.
9. A new request that tries to accept the already accepted version is rejected as an invalid state and does not create another acceptance event.
10. Owner B cannot accept Owner A's artifact version.
11. Anonymous, expired-session, revoked-session, and revoked-membership access cannot accept protected artifact state.
12. Direct client table writes cannot set artifact acceptance state or artifact-version lifecycle.
13. An injected failure at `artifact.accepted` audit insertion rolls back version lifecycle, artifact accepted-version pointer, revisions, and request result.
14. Restart/resume preserves the accepted-version identity and acceptance metadata.
15. Database interruption shows a recoverable error, and recovery restores the same committed accepted state without fixture substitution.
16. The Supabase security advisor reports no new error.
17. TypeScript, production build, prior durable suites, keyboard focus, responsive checks, and rendered screenshots pass.
18. Mobile and desktop rendered review confirms that accepted status, authority boundary, acceptance metadata, stable identifiers, and reference remain readable without horizontal overflow.

## 10. Excluded behavior

This slice does not implement:

- second or later artifact versions;
- changing the accepted version to a later version;
- superseded/replaced lifecycle terminology;
- file upload or object storage;
- import parsing;
- failed-import records or retry history;
- change summaries;
- artifact dependency or change-impact analysis;
- specialist-review records;
- evidence freshness or verification decisions;
- release authorization or production actions.

These exclusions keep acceptance inside the existing owner-only durable record model and leave later-version/import semantics to Increment 3.