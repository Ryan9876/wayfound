# Increment 2 — First durable workspace slice

**Status:** Proposed  
**Implementation state:** Blocked by ADR-0002 approval

## Outcome and scope

An authenticated owner creates or opens a workspace, sees its persisted project, release, and stage state, leaves, and resumes the same workspace after signing in again.

Implement this complete path before adding every future record type. The current visual baseline remains the reference. New workspaces start at Clarify; they must not inherit Borrow Desk's completed Stage 1, assumptions, owner, or evidence.

## Proposed relational model

This is a design for review, not an applied migration.

| Entity | Key fields | Invariants |
| --- | --- | --- |
| Actor | id, provider, provider_subject, created_at | Unique provider/subject; never identify ownership by editable display name or email alone |
| Workspace | id, name, problem_statement, created_at, updated_at, revision | One project per workspace in this slice; revision supports explicit concurrency checks |
| Membership | workspace_id, actor_id, role, created_at | Unique workspace/actor; initial role is owner; invitations and role changes are not exposed in this slice |
| Release | id, workspace_id, label, lifecycle, current_stage, revision | Initial lifecycle Proposed; stage number 1–15; at most one current release per workspace |
| Release stage | workspace_id, release_id, stage_number, state, revision | Exactly 15 rows on creation; unique release/stage; parent release must belong to the same workspace |
| Audit event | id, workspace_id, actor_id, operation, entity_id, correlation_id, created_at | Creation event committed with its records; ordinary users cannot rewrite history; no credentials or session tokens |
| Creation request | actor_id, request_id, payload_digest, workspace_id | Unique actor/request; identical retry returns the existing result; changed payload under the same key is rejected |

Stage state retains complete, active, upcoming, reopened, and blocked. Release lifecycle retains Proposed, Approved, In progress, Blocked, Implemented, Validated, Released, Deprecated, and Retired. Stage completion and release validation are distinct concepts. The first slice exposes no stage-completion or release-authorization mutation.

Creation sets Stage 1 active and Stages 2–15 upcoming. Stage labels and order come from the canonical catalog. The current stage points to a stage in the same release. Future reopening must not erase prior evidence.

Later Increment 2 work will add decisions, work, artifacts, evidence, and maintenance records. Their workspace/release references must retain tenant scope. Artifact acceptance and version history must not collapse into release lifecycle. Unknown impact remains explicit. No speculative tables for these workflows are required to prove the first slice.

## Boundaries and operations

| Layer | Responsibility |
| --- | --- |
| Presentation | Sign-in, workspace list, create form, persisted overview, loading/empty/error states |
| Application | Authenticate actor; check membership; validate input; create/open/list workspace; return presentation models |
| Persistence | Transactional PostgreSQL writes, membership-scoped reads, uniqueness and referential constraints |
| Identity adapter | Provider-specific session verification and subject mapping |
| AI guidance | No integration in this slice; cannot determine persisted state |

CreateWorkspace takes a name, problem statement, release label, and request key. Actor identity comes from the verified session. One transaction inserts workspace, owner membership, release, 15 stage rows, audit event, and retry result. A failed operation rolls back all of them. Concurrent identical requests create one workspace.

OpenWorkspace checks current membership before reading the workspace and release. A guessed identifier returns no data to a non-member. ListWorkspaces returns only memberships for the verified actor. Server restart must not change results.

Use row-level access policies and scoped database credentials. Deny direct client writes that bypass creation invariants. Review any database function privileges explicitly; do not add privileged functions merely to bypass a policy failure.

## Demo separation

Keep Borrow Desk available through an explicit demo route with fixture labeling. Persisted routes never import its project state or silently use it on error. Extract only the canonical stage catalog into shared domain code. Development seed tooling uses an isolated database, is repeatable, and never resets real workspaces. Default migrations contain no illustrative accepted evidence.

## Acceptance and failure tests

1. Sign in as owner A, create a workspace, and verify the entered name/problem/release and Stage 1 state from the database.
2. Close the browser, restart the application server, sign in again, and resume the same identifiers and state. Browser storage must not be the authoritative record.
3. Owner B cannot list, read, or mutate A's workspace through pages, application endpoints, or direct exposed database APIs.
4. An anonymous, expired, or signed-out session receives no protected data. Revoked membership prevents subsequent access even with a previously valid session.
5. Inject a creation failure after partial work. Confirm no partial workspace, membership, stage set, success audit event, or retry result remains.
6. Retry the same request concurrently. Confirm one workspace; reject reuse with different input.
7. Stop the database. Display a recoverable error without a success claim or fixture fallback. Restore connectivity and resume the last committed state.
8. Verify 15-stage catalog and lifecycle boundaries. New records have no invented completed evidence, accepted decisions, verification, or release authorization.
9. Run production build, TypeScript, prototype, accessibility, keyboard, and screenshot checks. Inspect phone and desktop sign-in/create/resume flows and existing routes.

## Delivery sequence after approval

1. Add model contracts, versioned migration, identity adapter, scoped persistence adapter, and transactional application service together with their integration tests.
2. Connect sign-in and create/open/resume screens to that service. Keep the existing demo accessible.
3. Execute the acceptance tests with real PostgreSQL and distinct test identities; record exact commit and evidence.
4. Reconcile architecture and delivery state. Mark only this slice Validated when it passes; the broader Increment 2 remains In progress.

No hosted deployment, spending, production migration, or acceptance of this proposed ADR is implied by this plan.
