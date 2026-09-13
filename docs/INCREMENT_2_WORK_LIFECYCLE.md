# Increment 2 — Owner work lifecycle

**Status:** In progress  
**Parent:** Increment 2 — Durable workspace record  
**Architecture basis:** Accepted ADR-0002; ADR-0003 remains unchanged

## Outcome and scope

The current workspace owner can approve, start, block, and resume work that the same authenticated actor owns. The saved record preserves the current state, reason, actor, time, and transition history after restart and re-login.

This bounded slice advances P0 `WF-REC-001`, `WF-REC-002`, and `WF-OWN-001`. It implements the already approved remaining work-state scope using the lifecycle meanings in `AGENTS.md`. It does not introduce collaborator membership or transfer responsibility.

## State and authority rules

| Current state | Action | Result | Required confirmation |
| --- | --- | --- | --- |
| Proposed | Approve work | Approved | The owner accepts this bounded work for implementation within their authority. |
| Approved | Start work | In progress | The owner reports that their work has started. |
| In progress | Block work | Blocked | The owner names the dependency or unresolved decision preventing progress. |
| Blocked | Resume work | In progress | The owner explains how the blocker was resolved and reports that work has resumed. |

Each action requires a non-empty reason, limited to 2000 characters, and explicit confirmation. Other transitions, including skipped approval, same-state updates, and completion states, fail. Approval accepts planned work only; it does not approve consequential technical choices. No action executes work or grants technical, specialist, verification, validation, release, or production authority.

The authenticated actor must have current explicit `owner` membership and must equal the stored work-item owner. A specialist assignment never satisfies this check. Caller-supplied actor, release, stage, or authority identifiers are not inputs. A second workspace owner cannot take responsibility for an existing owner's work through this action.

## Persistence and concurrency

Keep the existing private schema, RLS, invoker wrappers, narrow definer transactions, live-session checks, and absence of client table grants or an application service key.

`transition_work_item` accepts workspace and work-item IDs, expected revision, target state, reason, explicit confirmation, and request UUID. It locks the current owner membership and target work row. The expected revision must match the locked record. Concurrent distinct requests against one revision produce one transition and one stale-state error.

One transaction changes work status, increments revision, records immutable transition history, writes `work_item.transitioned` audit history, and saves the idempotent request result. History includes stable ID, old/new status, old/new revision, reason, actor, and timestamp. A same-actor/request UUID with identical normalized input returns the original transition ID even after subsequent transitions; changed input fails. Authorization is checked before returning a prior result. Audit failure rolls back all effects.

Owner reads include ordered transition history. The current blocker is the reason for the latest transition to `Blocked`. Resuming preserves the earlier blocker in history. Work content, ownership, release/stage, requirements, criteria, evidence, artifacts, specialist reviews, and release lifecycle remain unchanged.

## UI and failures

Use the established Work card, forms, typography, and responsive layout. Show actual status in text and accurate work counts. Provide only the action allowed from the current state. Show the current reason and expandable transition history with actor, time, and revision. Use explicit confirmation, pending state, keyboard focus, and an accessible error alert.

Stale-state errors instruct the owner to reload and review the current work. Unknown or cross-workspace targets fail. Ambiguous save errors offer an identical retry without asserting that an unconfirmed mutation did not commit. Database interruption shows a recoverable error, never fixture state. The only adapter retry remains exact `PGRST303` / `JWT issued at future` with the existing bounded delays.

## Acceptance criteria

1. The built UI performs all four allowed transitions and renders exact persisted state, reason, stable IDs, actor, timestamp, and history at desktop and 390 px mobile widths.
2. New work still starts Proposed. Invalid input, missing confirmation, unknown targets, cross-workspace targets, skipped transitions, repeated states, stale revisions, and unsupported completion/release states fail without changes.
3. Only the current live owner who owns the work can mutate it. Other tenants, assigned specialists, other owner actors, anonymous users, expired sessions, signed-out tokens, revoked sessions, and revoked memberships are denied, including idempotent replay.
4. Identical concurrent retries produce one transition, audit event, and request result. Changed request payload fails. Concurrent distinct requests at one revision produce one winner. Original identical replay after later progress returns the original ID without reverting state.
5. Direct private-table reads and writes remain denied. An injected audit failure rolls back state, revision, transition history, and request history; the same request succeeds after recovery.
6. Restart/re-login preserves state and history. Database interruption shows a recoverable error; recovery returns the same committed records. No external artifact URL is fetched.
7. Every prior durable regression suite passes. Security advisor, TypeScript, production build, prototype, accessibility, and keyboard checks pass. Rendered screenshots are inspected; exit codes alone are insufficient.
8. A validation record identifies the application commit, CI run, screenshot artifacts, executed checks, and limits. Final reconciled branch CI passes. PR #1 remains open, draft, unmerged, and not Released.

## Migration and recovery

The additive migration preserves existing Proposed records, expands only the allowed work states, and adds private transition/request tables and commands. No backfill fabricates history. Do not reverse the status constraint after transitions exist. An older application would label all work Proposed, so disable lifecycle mutations and retain a state-aware reader during application recovery; prefer a forward fix. No destructive data rollback or production restore claim is authorized.

## Exclusions

Assignment, collaborator administration, editing work content, deletion, cancellation, dependencies, broader record links, completion/Implemented/Validated/Released transitions, technical-decision acceptance, evidence review, freshness calculations, artifact import/versioning, and production actions remain later scope. The slice does not establish that a specialist accepted or completed work.
