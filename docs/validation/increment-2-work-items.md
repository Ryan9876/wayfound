# Increment 2 proposed-work-item slice validation

**Status:** Validated  
**Date:** 2026-09-13  
**Application commit:** `1f2a1c99856119c845a4495b61674bea415a4a77`  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary  
**Reviewer:** ChatGPT agent; no independent participant research claimed

## Result

The bounded proposed-work-item slice meets the acceptance checks in [INCREMENT_2_WORK_ITEMS.md](../INCREMENT_2_WORK_ITEMS.md). An authenticated workspace owner can record bounded planned work, see its explicit `Proposed` status, owner, stage, completion condition, and expected evidence, leave the application, restart it, sign in again, and recover the same durable record.

This validation does not establish execution, implementation, specialist review, verification, or work completion. Broader Increment 2 remains In progress.

## Executed evidence

[CI run 113](https://github.com/Ryan9876/wayfound/actions/runs/34775580084) completed successfully for application commit `1f2a1c99856119c845a4495b61674bea415a4a77`.

The normal `validate` job passed prototype structure, accessibility baseline, TypeScript, production build, keyboard navigation, responsive rendering, and screenshot capture.

The `durable-workspace` job passed:

- all three versioned migrations against isolated Supabase;
- the Supabase database security advisor with `No issues found`;
- real authentication and the previously validated workspace and owner-decision checks;
- atomic proposed-work-item creation;
- persisted current release and stage capture;
- owner actor derived from the verified session and current owner membership;
- explicit `Proposed` status;
- idempotent retry and changed-payload rejection;
- tenant isolation and direct-table denial;
- anonymous, expired, revoked-session, and revoked-membership denial paths;
- injected `work_item.proposed` audit failure with full transaction rollback;
- application restart and work-item resume;
- database interruption and recovery;
- keyboard focus and responsive screenshots.

The acceptance harness reported:

> PASS: real Supabase authentication, atomic workspace, owner-decision, and proposed work-item creation, idempotent retries, tenant isolation, authority boundaries, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.

Artifact: `workspace-screenshots`, ID `10323149094`. Artifact digest: `sha256:e5b27a9bd07c48de6925daf3ccd8441eec39f2dcefa83cc7aa956a004ce8cc79`.

## Rendered review

The final `saved-work-item` screenshots were reviewed at 390-pixel mobile width and desktop width.

Both layouts show:

- the work-item title and bounded outcome;
- `Status: Proposed`;
- `Owner: Product owner`;
- the captured stage;
- the completion condition;
- expected evidence;
- revision;
- the work-item creation form and its status warning.

The form states that saving creates proposed work only and does not start execution, assign a specialist, or claim implementation, review, or verification. No horizontal overflow was observed. The database-unavailable rendering states that the saved record has not been replaced and does not fall back to fixture data.

## Data and failure checks

Creation is one database transaction. The acceptance harness injected a failure when the `work_item.proposed` audit event was inserted and confirmed that the work item, audit event, and idempotency result all rolled back.

A duplicate request with the same actor, request key, and payload returns the original identifier. Reuse of the same key with changed input is rejected. Removing current membership removes access to the work item and prevents retry-based mutation.

## Limits and remaining work

This validation covers creation and read/resume of owner-owned proposed work items only. It does not implement:

- work-state transitions;
- start, blocked, complete, implemented, reviewed, or validated states;
- editing, deletion, or supersession;
- collaborator or specialist assignment;
- dependencies or sequencing;
- requirement or accepted-decision links;
- attached or accepted evidence;
- change-impact analysis;
- artifact import, specialist handoff, or release authorization.

No hosted production deployment or Released state is claimed.
