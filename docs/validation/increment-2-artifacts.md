# Increment 2 — Durable proposed artifacts validation

**Status:** Validated  
**Validation date:** 2026-09-13  
**Validated application commit:** `8d36adede6c4b5c5570b7a3e37a519588124500b`  
**CI run:** 157 — https://github.com/Ryan9876/wayfound/actions/runs/34780475855

## Outcome

The durable proposed-artifact slice is **Validated** against the isolated local Supabase stack and rendered application.

An authenticated workspace owner can record a stable artifact identity with version 1 in lifecycle `Proposed`, store an HTTP or HTTPS external reference, leave and resume the workspace, and see the same artifact and version identifiers later. Recording the artifact does not accept the version as project direction.

## Executed evidence

CI run 157 passed:

- prototype structure check;
- accessibility baseline;
- TypeScript check;
- production build;
- keyboard navigation;
- responsive screenshot capture;
- all six database migrations;
- Supabase database security advisor with `No issues found`;
- the complete previously validated durable workspace/decision/work-item/requirement regression suite;
- the previously validated durable criterion-evidence suite;
- the new durable artifact acceptance suite.

Exact artifact-suite result:

> PASS: durable proposed artifact records create stable artifact/version identities without accepting project direction; external references remain unfetched; idempotency, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, keyboard focus, and responsive screenshots passed.

## Artifact behavior validated

The executed suite demonstrated that:

1. one owner request creates one stable artifact identity and one artifact-version identity;
2. the initial version number is `1` and lifecycle is `Proposed`;
3. source kind is `ExternalReference`;
4. actor, release, and stage are derived from the verified session and durable workspace state;
5. no accepted-version field or accepted lifecycle state is created by this slice;
6. an identical retry returns the original artifact identifier and does not create a duplicate version;
7. the same request key with changed input is rejected;
8. non-HTTP(S) reference URLs are rejected;
9. another workspace owner cannot list or create artifacts in the owner workspace;
10. anonymous, signed-out, expired-session, revoked-session, and revoked-membership access is denied;
11. direct client reads of private artifact tables and direct exposed-table writes are denied;
12. an injected `artifact.proposed` audit failure rolls back artifact, version, audit, and idempotency state;
13. application restart/resume preserves the artifact and version identifiers;
14. a database interruption renders the recoverable workspace error instead of substituting fixture data, and recovery restores the same durable artifact records.

## External-reference non-fetch evidence

The artifact acceptance harness ran a local HTTP server at the exact URL stored as the first proposed artifact reference. It counted requests to that server.

The request count remained zero through:

- RPC creation;
- artifact listing;
- workspace rendering;
- UI creation of a second artifact;
- application restart and resume;
- database interruption and recovery.

This validates the bounded behavior that Wayfound stores the external reference but does not fetch referenced content in this slice.

## Rendered review

Screenshot artifact:

- name: `workspace-screenshots`;
- artifact ID: `10325166071`;
- digest: `sha256:944d655985242c79cac39ca3164bd5665aa53f118905074cfe106cb60e71a8cd`;
- 21 rendered files, including `saved-artifact-desktop.png`, `saved-artifact-mobile.png`, and `artifact-database-unavailable.png`.

Desktop and 390 px mobile review confirmed that the Artifacts section keeps these items readable without horizontal overflow:

- artifact title and kind;
- version number;
- `Proposed` lifecycle text;
- summary;
- external-reference label and URL;
- stage and recorder;
- stable artifact identifier;
- stable version identifier;
- explicit `Not accepted project direction` warning;
- proposed-artifact creation form.

The database-unavailable render states that the saved record has not been replaced and offers retry/sign-in recovery actions.

## Security and transaction evidence

The sixth migration applied successfully before the tests. The Supabase security advisor returned `No issues found`.

Artifact persistence remains in the private `wayfound` schema. Public functions are invoker wrappers around scoped private functions. Client table access is not granted. The application uses no service key.

`create_proposed_artifact` creates the artifact, version, `artifact.proposed` audit event, and idempotency result in one transaction. The injected audit failure proved rollback of all four durable effects.

## Limits

This validation does **not** establish:

- artifact acceptance or rejection;
- an accepted-version pointer;
- artifact version 2 or later;
- file upload or object storage;
- file or document import;
- failed-import or import-retry history;
- artifact comparison or change summary;
- specialist-return reconciliation;
- artifact dependency/change-impact analysis;
- evidence freshness or verification decisions;
- hosted persistence or production deployment;
- Released status.

Broader Increment 2 remains **In progress**.
