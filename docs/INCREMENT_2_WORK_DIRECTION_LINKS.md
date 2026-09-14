# Increment 2 — Durable work-to-project-direction links

**Status:** Approved for implementation

**Parent:** Increment 2 — Durable single-owner workspace record

**Requirement basis:** `WF-REC-001`, `WF-REC-003`, `WF-REC-002`

**Architecture basis:** Accepted ADR-0002 and ADR-0005; no new trust boundary is introduced

## Outcome

The authenticated workspace owner can record that a durable work item relies on accepted project direction: either an accepted owner decision or the exact currently accepted artifact version.

This is a bounded traceability primitive for later `WF-REC-003` change-impact behavior. It records known reliance now; it does **not** claim that a linked record changed, that work is affected, that impact is known, or that review is complete.

## Terms

- **Dependent work** — the work item that relies on accepted project direction.
- **Direction target** — either one accepted owner decision or one exact currently accepted artifact version.
- **Active link** — a work-to-project-direction link that has not been removed.

A link means only: “this work relies on this accepted project direction.”

## Supported targets

This slice supports two active first-version target kinds:

1. **Accepted owner decision** — an exact durable owner decision in the same workspace with status `Accepted`.
2. **Accepted artifact version** — the exact artifact version currently selected by that artifact's `accepted_version_id`, in the same workspace, with lifecycle `Accepted`.

Historical multi-human technical-review records are not added to the active first-version UI by this slice.

## Saved link semantics

Every link stores a stable link identity plus:

- workspace ID;
- dependent work-item ID;
- dependent work revision at link creation;
- direction-target kind;
- for a decision target: decision ID and decision revision at link creation;
- for an artifact target: artifact ID, artifact revision, exact accepted artifact-version ID, and artifact-version revision at link creation;
- a non-empty owner reason explaining the reliance;
- creating owner actor and creation time;
- optional removal actor, removal reason, and removal time after explicit removal.

The link continues to identify the exact saved target after creation. Later target lifecycle/version work must not silently retarget the link.

## No automatic impact or lifecycle semantics

Creating or removing a direction link does **not** automatically:

- change the work item's status or revision;
- mark work `Blocked`, `Implemented`, affected, stale, reviewed, safe, or unaffected;
- change the decision or artifact;
- change an artifact's accepted version;
- create or satisfy a requirement or acceptance criterion;
- create verification evidence;
- complete or reopen a stage;
- establish validation, release readiness, release, or production authorization.

This slice does not implement the “when accepted direction changes” trigger from `WF-REC-003`. It establishes the durable known-dependency record that a later change-impact slice can evaluate.

If future impact is unknown, later `WF-REC-003` behavior must preserve that state as unknown until resolved. This slice must not manufacture an impact answer.

## Valid link rules

A link can be created only when all of these conditions are true:

1. the work item exists in the exact workspace;
2. the authenticated actor has current explicit `owner` membership and owns the work item;
3. the direction target exists in the exact same workspace;
4. a decision target is currently `Accepted`;
5. an artifact target is the exact current `accepted_version_id` and that version lifecycle is `Accepted`;
6. no identical active work/target link already exists;
7. the owner supplies a non-empty reason and explicit confirmation.

Work status does not determine whether the owner can record the relationship. Proposed, Approved, In progress, Blocked, and Implemented work may rely on accepted project direction.

## Target identity rules

A decision link is unique while active by workspace, work item, and decision identity.

An artifact link is unique while active by workspace, work item, and artifact identity. The exact accepted version used at creation is stored. A future accepted-version change does not silently update that saved version.

If future reconciliation moves the work to a new accepted artifact version, that later behavior must preserve the old link as history and explicitly establish the new relationship rather than rewriting the prior target.

## Removal and history

The owner can remove an active direction link only after recording:

- a non-empty removal reason;
- explicit confirmation;
- removing owner actor and removal time.

Removal makes the link inactive. It does not delete the row or its creation metadata and does not change the work item or direction target.

An already removed link cannot be removed again through a distinct request. An identical idempotent replay returns the original result.

After removal, a later link to the same decision or artifact may be created as a new durable record if the target is still eligible under the current rules.

## Authority and security

The server/database derives the owner actor from the live authenticated session and current workspace membership.

Caller-supplied actor, owner, work revision, decision revision, artifact revision, artifact-version revision, acceptance state, creation time, removal time, or authority state is not trusted.

The database resolves and snapshots target revisions from authoritative durable rows while the mutation is locked.

Unknown, cross-workspace, unaccepted, stale-artifact-version, revoked-session, and revoked-membership paths fail without partial state.

Direct protected-table writes remain denied.

A direction link grants no decision authority, artifact-acceptance authority, verification authority, release authority, or production-changing authority.

## Persistence and idempotency

Creation and removal are transactional and idempotent by current owner/request UUID plus normalized request payload.

Identical replay returns the original link ID. Reusing the request UUID with changed payload fails.

Distinct concurrent requests for the same active work/target pair produce one durable active link.

An injected audit failure rolls back the full mutation and request-result record.

Database interruption must not substitute fixture data or report an unconfirmed mutation as successful.

## Read model and UI

The active single-user Work card keeps two concepts visibly separate:

- **Work dependencies** — this work depends on another work item.
- **Project direction** — this work relies on an accepted decision or accepted document version.

For each active direction link, show plain-language target type, title, current accepted state where relevant, the saved reliance reason, and a direct link to the Records view.

Secondary details expose the saved target revision/version snapshot and stable IDs.

The add-link control lists only eligible same-workspace targets:

- accepted owner decisions;
- artifacts with an exact current accepted version.

It requires a reason and explicit owner confirmation and states that the link records reliance only; it does not determine impact or change work status.

The removal action requires a reason and explicit confirmation.

Creation forms remain behind progressive disclosure. The UI must remain usable at desktop and 390 px mobile widths and important status must be conveyed with text, not color alone.

## Acceptance criteria

1. A current authenticated owner can create a work-to-decision link only to an accepted owner decision in the same workspace, with a non-empty reason and explicit confirmation.
2. Decision-link creation stores a stable link ID, work ID/revision, decision ID/revision, reason, creating actor, and creation time from authoritative state.
3. A current authenticated owner can create a work-to-artifact link only to the exact currently accepted version of an artifact in the same workspace.
4. Artifact-link creation stores a stable link ID, work ID/revision, artifact ID/revision, exact accepted version ID/revision, reason, creating actor, and creation time from authoritative state.
5. Proposed/unaccepted artifact versions, stale/non-current artifact versions, unknown targets, cross-workspace targets, revoked authority, and direct protected-table writes fail without partial state.
6. Creating a direction link does not change the work item, decision, artifact, artifact version, requirement, criterion, evidence, AI review, stage, or release state.
7. Active duplicate links are rejected and distinct concurrent requests for the same active work/target pair produce one durable winner.
8. Identical create replay returns the original link ID; changed-payload request-key reuse fails.
9. Work reads expose active direction links with target type/title, saved reason, immutable creation snapshots, and current target context sufficient for the UI.
10. Eligible candidate reads expose accepted owner decisions and exact current accepted artifact versions only.
11. The current owner can remove an active direction link only with a non-empty reason and explicit confirmation.
12. Removal preserves the original row and creation metadata and records removing actor, reason, and time without changing the work item or target.
13. Identical removal replay returns the original result; changed-payload reuse and distinct removal of an already inactive link fail without partial state.
14. Injected audit failure rolls back create/removal state and idempotent request results.
15. Restart and re-login preserve active and removed link history.
16. The active Work UI separates work-to-work dependencies from project-direction reliance and does not label a link as affected, stale, blocked, safe, verified, or resolved.
17. Keyboard checks, unique DOM IDs, no horizontal overflow, desktop/390 px screenshots, TypeScript, production build, security advisor, prior durable regressions, and a focused direction-link acceptance suite pass on the identified build.
18. A validation record identifies the application commit, CI run, executed evidence, screenshots, limits, and remaining change-impact scope before the slice is marked `Validated`.

## Migration and recovery

Use additive schema changes. Existing work, decisions, and artifacts require no backfill because absence of a link means only that no reliance relationship has been recorded.

Application rollback may leave direction-link rows unreadable by older code. During rollback, disable incompatible mutations and retain the database rows. Prefer a forward fix over destructive link-table rollback.

## Exclusions

This slice does not implement:

- automatic detection that an accepted decision or artifact changed;
- `affected`, `unaffected`, `unknown impact`, `review needed`, or resolved-impact lifecycle states;
- automatic work blocking/resuming or dependency satisfaction;
- generic links among arbitrary record types;
- requirement-to-work or evidence-to-work links;
- accepted decision replacement/supersession;
- later artifact-version import or accepted-version replacement;
- multiple acceptance-criterion lifecycle;
- evidence freshness/outdated-state handling or verification decisions;
- stage completion, release readiness, release authorization, deployment, or production-changing actions.
