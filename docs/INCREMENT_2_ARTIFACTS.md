# Increment 2 — Durable proposed artifacts

**Status:** In progress  
**Parent increment:** Increment 2 — Durable workspace record  
**Architecture basis:** ADR-0002 and the validated durable workspace-record boundary

## 1. Outcome

An authenticated workspace owner can record a durable artifact with one initial version and resume the same record later.

Every artifact version created in this slice is `Proposed`. Recording it does not make it accepted project direction.

## 2. Requirement coverage

This slice advances the approved first-version commitment for versioned artifacts and external references. It also advances durable project continuity without relying on chat history.

It prepares the data boundary required by `WF-IMP-001` through `WF-IMP-004`, but it does not implement file import, artifact acceptance, failed-import history, retry import history, or change summaries.

## 3. Artifact semantics

The approved glossary defines an `artifact` as a versioned project output. An `accepted artifact` is the artifact version currently accepted as project direction. A `proposed artifact` is a new or changed artifact version awaiting acceptance.

This bounded slice creates:

- one stable artifact identity;
- one stable artifact-version identity;
- version number `1`;
- lifecycle `Proposed`;
- an external reference that identifies where the artifact can be found;
- no accepted version.

Recording a proposed artifact MUST NOT:

- mark the artifact version `Accepted`;
- replace accepted project direction;
- claim specialist review;
- claim verification;
- fetch or execute content from the external reference;
- create a release-readiness decision.

## 4. Artifact record

Each durable artifact identity contains:

- immutable artifact identifier;
- workspace identifier;
- release identifier resolved from durable workspace state;
- stage number resolved from durable workspace state;
- title, required, 1–160 characters;
- kind, required, 1–80 characters;
- creating actor identifier derived from the verified session;
- revision;
- created and updated timestamps.

Each initial artifact version contains:

- immutable version identifier;
- workspace identifier;
- artifact identifier;
- version number `1`;
- lifecycle `Proposed`;
- summary, required, 1–4000 characters;
- source kind `ExternalReference`;
- reference label, required, 1–160 characters;
- reference URL, required, at most 2048 characters and limited to HTTP or HTTPS;
- creating actor identifier derived from the verified session;
- release identifier and stage number captured when the version is created;
- revision;
- created and updated timestamps.

The application stores the external reference as project data. It does not request the referenced resource in this slice.

## 5. Authorization and data authority

PostgreSQL remains authoritative.

Only an authenticated current workspace owner can list or record artifacts in this bounded owner-only membership model. The database derives the actor, release, and current stage. The client does not supply acceptance status or specialist authority.

Direct client table reads and writes to artifact storage are denied. Scoped RPCs enforce the same membership and session rules as the validated durable slices.

## 6. Recording behavior

`CreateProposedArtifact` takes workspace identifier, title, kind, summary, reference label, reference URL, and request key.

One transaction:

1. verifies the current session;
2. verifies current owner membership;
3. resolves the current release and stage from durable state;
4. validates and trims input;
5. creates one artifact identity;
6. creates artifact version `1` with lifecycle `Proposed`;
7. records `artifact.proposed` in the audit log;
8. records the request result for idempotent retry.

An identical retry with the same actor and request key returns the original artifact identifier. Reusing the same request key with changed input is rejected.

A failed operation leaves no partial artifact, version, audit event, or retry result.

## 7. Presentation

The persisted workspace shows an `Artifacts` project-record section.

For each artifact, the workspace shows:

- title;
- kind;
- current recorded version number;
- lifecycle `Proposed` in text;
- summary;
- external-reference label and URL;
- stage;
- stable artifact identifier;
- stable version identifier;
- explicit text that the version is not accepted project direction.

The create form states that Wayfound records the reference but does not fetch the external content.

## 8. Failure behavior

If artifact recording fails, the application leaves existing workspace records unchanged and shows a recoverable error.

A database interruption must not replace durable artifacts with fixture records or claim that a failed save succeeded.

The existing bounded retry for exact PostgREST `PGRST303: JWT issued at future` may apply. Authorization failures remain failures.

## 9. Acceptance criteria

1. Owner A records an artifact through the application. The database creates one artifact identity and one version with version number `1` and lifecycle `Proposed`.
2. The database derives owner actor, release, and stage from durable state rather than caller-supplied authority data.
3. The artifact remains `Proposed`; no accepted-version pointer or accepted lifecycle state is created.
4. The rendered artifact explicitly states that the proposed version is not accepted project direction.
5. The external reference is stored but is not fetched by the application during create, list, open, or resume.
6. The owner leaves the workspace, the application server restarts, the owner signs in again, and the same artifact and version identifiers remain visible.
7. Repeating the same request key with identical input creates one artifact and one version. Reusing the key with changed input is rejected.
8. Invalid or non-HTTP(S) reference URLs are rejected.
9. Owner B cannot list or create artifacts in Owner A's workspace.
10. Anonymous, expired, signed-out, revoked-session, and revoked-membership access cannot read or create protected artifact data.
11. An injected failure after artifact/version insertion rolls back artifact, version, audit event, and request result.
12. Direct client table read or write access to artifact storage is denied.
13. The database security advisor reports no new error.
14. TypeScript, production build, all previously validated durable suites, keyboard checks, responsive checks, and rendered screenshots pass.
15. Mobile and desktop rendered review confirms that artifact lifecycle, summary, reference, stable identifiers, stage, and non-acceptance warning remain readable without horizontal overflow.

## 10. Excluded behavior

This slice does not implement:

- artifact acceptance or rejection;
- accepted-version selection;
- second or later artifact versions;
- file uploads or object storage;
- import parsing;
- failed-import records;
- successful import retry history;
- change summaries or comparisons;
- returned specialist-work reconciliation;
- artifact dependency or change-impact analysis;
- evidence freshness calculation;
- production release behavior.

These exclusions keep this slice inside the existing owner-only authority model and preserve Increment 3 for import and accepted-version behavior.
