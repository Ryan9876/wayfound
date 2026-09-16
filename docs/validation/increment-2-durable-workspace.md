# Increment 2 durable-workspace slice validation

**Status:** Validated  
**Date:** 2026-09-13  
**Application commit:** `603f02862ae4090bd1853157e449a01508186f4c`  
**Architecture decision:** [ADR-0002](../adr/0002-durable-workspace-identity.md)  
**Reviewer:** ChatGPT agent; no independent participant research claimed

## Result

The first Increment 2 durable-workspace slice meets the acceptance checks in [INCREMENT_2_SLICE.md](../INCREMENT_2_SLICE.md). An authenticated owner can create, list, open, leave, and resume the same PostgreSQL-backed workspace through the application. The result covers only this bounded create/open/resume slice. Increment 2 remains In progress for later approved record types and workflows.

This validation does not establish a hosted production deployment, production migration, release authorization, or Released state.

## Executed evidence

[CI run 70](https://github.com/Ryan9876/wayfound/actions/runs/34771654200) completed successfully for application commit `603f02862ae4090bd1853157e449a01508186f4c`.

The `validate` job passed:

- prototype structure checks;
- accessibility baseline checks;
- TypeScript;
- production build;
- rendered keyboard navigation and visible-focus checks;
- responsive screenshot capture.

The `durable-workspace` job passed:

- isolated Supabase startup with the versioned durable-workspace migration;
- production build;
- Supabase database security advisor with no reported errors;
- real Supabase authentication;
- atomic PostgreSQL workspace creation;
- duplicate-request idempotency and changed-payload rejection;
- workspace tenant isolation;
- anonymous, expired, signed-out, revoked-session, and revoked-membership denial paths;
- injected creation failure and full transaction rollback;
- application restart and persisted resume;
- database interruption, recoverable error rendering, recovery, and preservation of the last committed state;
- keyboard focus and responsive rendered checks.

The acceptance harness reported:

> PASS: real Supabase authentication, atomic PostgreSQL creation, duplicate retries, tenant isolation, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.

Artifact: `workspace-screenshots`, ID `10322625094`. Artifact digest: `sha256:c1db3eb8dd168941236ed23a5d5bd39da67a80ffc8a3b03361c3a174717a9506`. The committed workflow can reproduce the evidence after artifact retention expires.

## Acceptance criteria result

| Criterion | Result |
| --- | --- |
| Owner A creates a workspace and persisted name, problem, release, and Stage 1 state are verified | Passed |
| Server restart does not change the saved identifiers or state; the owner can sign in and resume | Passed |
| Owner B cannot list or read Owner A's workspace and exposed direct database mutation is denied | Passed |
| Anonymous, expired, signed-out, revoked-session, and revoked-membership paths expose no protected workspace data | Passed |
| Injected failure during creation leaves no partial durable workspace state | Passed |
| Concurrent identical create requests resolve to one workspace; changed payload under the same request key is rejected | Passed |
| Database interruption renders a recoverable failure without fixture fallback; recovery returns the last committed state | Passed |
| New workspaces contain all 15 stages, start with Stage 1 active and a Proposed release, and contain no invented evidence or completion claims | Passed |
| Production build, TypeScript, prototype, accessibility, keyboard, and responsive rendered checks pass | Passed |

## Rendered review

The final CI artifact was reviewed at 390-pixel mobile width and desktop width. The evidence includes sign-in, empty workspace, saved workspace, saved-workspace list, and database-unavailable states.

The saved workspace renders the entered project state, Release 1.0 as Proposed, Stage 1: Clarify, the problem statement, and the complete 15-stage journey. Mobile content remains within the viewport. The database-unavailable state does not substitute fixture data or claim success.

## PostgREST JWT clock-skew handling

The CI environment exposed an intermittent PostgREST `PGRST303` response with the message `JWT issued at future` immediately after Supabase issued a valid session token. The persistence adapter and acceptance harness use a bounded retry only for that exact code and message.

Authorization failures are not retried as success. Denial tests explicitly reject `PGRST303` as evidence of correct authorization and require the intended denial result. This keeps the workaround separate from workspace access policy.

## Limits and remaining work

This validation applies only to the first durable create/open/resume slice under ADR-0002. Broader Increment 2 remains In progress. Decision, work, artifact, evidence, and maintenance records are not validated by this record. Hosted service provisioning and production deployment remain outside this result. No Released claim is made.
