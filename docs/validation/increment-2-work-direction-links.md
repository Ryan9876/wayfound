# Increment 2 work-to-project-direction links validation

**Status:** Validated application/test slice

**Validated application/test head:** `ccf138887980c9bc7c53a3a9817c9c75572278c3`

**CI run:** 367 (`34897131866`)

**Requirement basis:** `WF-REC-001`, `WF-REC-002`, `WF-REC-003`

**Slice:** [INCREMENT_2_WORK_DIRECTION_LINKS.md](../INCREMENT_2_WORK_DIRECTION_LINKS.md)

## Validated outcome

The current authenticated workspace owner can record that durable work relies on accepted project direction in either of two bounded forms:

- one accepted owner decision in the same workspace; or
- the exact artifact version that is currently accepted for an artifact in the same workspace.

The saved relationship retains authoritative creation-time revision/version snapshots, owner reason, actor, time, and reversible removal history. The Work view shows these relationships under **Project direction**, separately from work-to-work **Dependencies**.

A project-direction link records known reliance only. It does not say that the linked direction changed or that work is affected, stale, blocked, safe, verified, reviewed, or resolved. It does not change work lifecycle, accepted direction, evidence, verification, stage, release, or production authority.

## CI evidence

CI run 367 completed successfully on exact application/test head `ccf138887980c9bc7c53a3a9817c9c75572278c3`.

The run passed both jobs and included:

- prototype, accessibility, single-user-mode, local-AI, and workspace-guidance contract checks;
- TypeScript and optimized production builds;
- keyboard navigation and responsive screenshot capture;
- isolated local Supabase startup and all migrations through `20260914210100_work_direction_read_model.sql`;
- Supabase security advisor with no errors;
- the complete prior durable regression chain;
- repaired historical owner-work-lifecycle regression coverage with the expanded work read model;
- focused durable work-item dependency validation;
- focused durable work-to-project-direction link validation;
- consequential technical-decision and technical-requirement regression suites; and
- automatic single-user owner-session/UI validation after a clean local database reset.

The focused direction-link suite reported:

> PASS: durable work-to-project-direction links record owner-confirmed reliance on accepted decisions and exact accepted artifact versions without inventing impact state; target eligibility, authoritative snapshots, no lifecycle side effects, duplicate/concurrency denial, idempotency, audit rollback, reversible history, revocation, re-login persistence, unique IDs, keyboard focus, and desktop/390 px rendering passed.

## Focused behavior exercised

The focused suite exercises and confirms:

- current-owner authorization and stored work ownership;
- accepted same-workspace owner-decision eligibility;
- exact current accepted artifact-version eligibility;
- rejection of proposed/unaccepted, mismatched, unknown, and cross-workspace targets;
- authoritative snapshots of work revision, decision revision, artifact revision, and exact accepted artifact-version revision;
- candidate reads derived from authoritative accepted state rather than browser-supplied acceptance or revision data;
- active-link uniqueness and one-winner behavior for distinct concurrent duplicate requests;
- identical create replay and changed-payload request-key conflict behavior;
- no collateral mutation of work, decision, artifact/version, release, or other project-authority state;
- direct protected-table write denial;
- transactional audit failure rollback and retry;
- explicit reversible removal that preserves the original durable row and creation metadata;
- removal idempotency and already-inactive rejection;
- membership/session revocation denial;
- re-login persistence of active and removed history;
- unique DOM IDs, keyboard reachability, visible focus, and no horizontal overflow; and
- responsive desktop and 390 px rendered behavior.

Run 366 had previously exposed a historical work-lifecycle test assumption: that test captured the entire work read object before creating accepted decision/artifact fixture records. Because the new read model correctly adds those records as eligible direction candidates, the old whole-object equality became stale. Commit `ccf138887980c9bc7c53a3a9817c9c75572278c3` moved the unchanged-work snapshot to after fixture setup while separately retaining status/revision/history assertions. Run 367 then passed the historical lifecycle suite and every downstream gate. No historical lifecycle assertion was weakened to ignore work-state mutation.

## Rendered evidence

The `workspace-screenshots` artifact from run 367 is:

- **Artifact ID:** `10368683554`
- **Size:** `34,620,315` bytes
- **GitHub SHA-256:** `3be8352a76c986bc10b7d30ae62c63e659732d02b078821f3129f469ea12813b`
- **Files inspected directly:** `work-direction-links-desktop.png` and `work-direction-links-mobile.png`

Direct visual inspection confirmed:

- **Dependencies** and **Project direction** remain visibly separate concepts;
- accepted decision and accepted document/version links are understandable without opening internal metadata;
- saved reliance reason and revision/version snapshot details remain visible;
- explicit unlink/removal controls are present;
- the interface does not label these records affected, stale, blocked, safe, verified, or resolved;
- the 390 px mobile layout remains readable without horizontal overflow; and
- desktop layout remains aligned with the active single-owner Wayfound workspace.

The artifact also contains the prior durable and active single-user UI screenshots generated by the same exact run.

## Authority and data boundary verified

The validated link means only that a work item relies on accepted project direction. The database resolves accepted state and snapshots revisions inside the mutation boundary. Caller-supplied actor, revision, accepted state, lifecycle, and creation/removal metadata are not trusted as authority.

Creating or removing a link does not:

- change the work item's status or revision;
- change an accepted decision;
- select or replace an accepted artifact version;
- create evidence or a verification decision;
- make a criterion pass;
- complete/reopen a stage;
- establish validation or release readiness; or
- authorize deployment or another production-changing action.

## Limits and remaining scope

This validation does **not** claim implementation of the later change trigger or impact lifecycle required to complete `WF-REC-003` behavior. In particular, it does not implement:

- automatic detection that an accepted decision or artifact changed;
- accepted-decision replacement/supersession;
- later accepted-artifact-version replacement/supersession;
- `affected`, `unaffected`, `unknown impact`, `review needed`, or resolved-impact states;
- automatic work blocking/resume or dependency satisfaction;
- generic arbitrary-record links;
- requirement-to-work or evidence-to-work links;
- evidence freshness/outdated-state handling;
- verification decisions; or
- release or production-changing authority.

Future change-impact work must use the durable link as input and preserve unknown impact as unknown until an authorized process resolves it. This slice must not be reinterpreted as an impact decision.

## Validation conclusion

The bounded work-to-project-direction link slice is **Validated** at application/test head `ccf138887980c9bc7c53a3a9817c9c75572278c3` through CI run 367 and direct rendered-evidence review. Increment 2 as a whole remains **In progress**.
