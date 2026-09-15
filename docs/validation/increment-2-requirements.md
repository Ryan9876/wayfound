# Increment 2 owner-approved requirement slice validation

**Status:** Validated  
**Date:** 2026-09-13  
**Application commit:** `9e2af6940ce4d440fed00825620e0b693eff17c2`  
**Architecture basis:** ADR-0002 and the validated durable-workspace boundary  
**Reviewer:** ChatGPT agent; no independent participant research claimed

## Result

The bounded owner-approved product requirement slice meets the acceptance checks in [INCREMENT_2_REQUIREMENTS.md](../INCREMENT_2_REQUIREMENTS.md). An authenticated workspace owner can record an approved product requirement with one durable acceptance criterion, leave the application, restart it, sign in again, and recover the same requirement and criterion identifiers and content.

This validation does not establish specialist approval of consequential technical requirements, requirement verification, criterion pass/fail state, or evidence linkage. Broader Increment 2 remains In progress.

## Executed evidence

[CI run 131](https://github.com/Ryan9876/wayfound/actions/runs/34776962622) completed successfully for application commit `9e2af6940ce4d440fed00825620e0b693eff17c2`.

The normal `validate` job passed prototype structure, accessibility baseline, TypeScript, production build, keyboard navigation, responsive rendering, and screenshot capture.

The `durable-workspace` job passed:

- all four versioned migrations against isolated Supabase;
- the Supabase database security advisor with `No issues found`;
- real authentication and the previously validated workspace, owner-decision, and proposed-work-item checks;
- atomic owner-approved requirement and acceptance-criterion creation;
- persisted current release and stage capture;
- approving actor derived from the verified session and current owner membership;
- `Approved` requirement status, `product` kind, `owner` authority, and `MUST`/`SHOULD`/`MAY` validation;
- exactly one initial linked acceptance criterion with its own immutable identifier;
- explicit authority-confirmation rejection;
- idempotent retry and changed-payload rejection;
- tenant isolation and direct-table denial for requirements and acceptance criteria;
- anonymous, expired, revoked-session, and revoked-membership denial paths;
- injected `requirement.approved` audit failure with full transaction rollback;
- application restart and requirement resume;
- database interruption and recovery;
- keyboard focus and responsive screenshots.

The acceptance harness reported:

> PASS: real Supabase authentication, atomic workspace, owner-decision, proposed work-item, and owner-approved requirement creation, idempotent retries, tenant isolation, authority boundaries, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.

Artifact: `workspace-screenshots`, ID `10323387642`. Artifact digest: `sha256:6cff36eef0e3ae3af6b98f31d6321d15641a2abcb3b809f5f1c7a20b12a18e48`.

## Rendered review

The final `saved-requirement` screenshots were reviewed at 390-pixel mobile width and desktop width.

Both layouts show:

- the requirement title and statement;
- the `MUST` obligation;
- `Status: Approved`;
- `Authority: Product owner`;
- the captured stage and revision;
- a durable requirement identifier;
- one durable criterion identifier;
- the acceptance-criterion statement;
- the explicit label `Acceptance criterion · Not verification evidence`;
- the owner-authority warning and requirement form.

No horizontal overflow was observed. The database-unavailable rendering states that the saved record has not been replaced and does not fall back to fixture data.

## Data and failure checks

Requirement creation is one database transaction. The acceptance harness injected a failure when the `requirement.approved` audit event was inserted and confirmed that the requirement, acceptance criterion, audit event, and idempotency result all rolled back.

A duplicate request with the same actor, request key, and payload returns the original requirement identifier and does not create another criterion. Reuse of the same key with changed input is rejected. Removing current membership removes access to requirement data and prevents retry-based mutation.

The acceptance criterion is stored as a condition only. No evidence record, pass/fail state, verified state, or current-evidence claim is created by this slice.

## Validation defects found and corrected

Two browser-harness defects were found before the successful run. Neither was an application or persistence defect.

- CI run 129 used an exact accessible-label lookup for the obligation select. Because the select options contribute to the nested label's accessible name, the form was rendered but the test selector did not match. The harness now targets the stable select identifier.
- CI run 130 used an unscoped strict lookup for `Authority: Product owner`. After the requirement was correctly rendered, both the Decisions and Requirements sections contained that valid text, so the locator was ambiguous. The requirement assertions are now scoped to the Requirements section.

Both failed runs had already passed migration application, application build, requirement API checks, rollback checks, authorization checks, and the Supabase security advisor before reaching the affected browser assertion.

## Limits and remaining work

This validation covers creation and read/resume of owner-approved product requirements with one initial acceptance criterion only. It does not implement:

- proposed or draft requirement records;
- consequential technical requirement approval or specialist review;
- editing, withdrawal, supersession, or deprecation;
- multiple acceptance criteria per requirement;
- criterion status or pass/fail state;
- requirement-to-work or requirement-to-decision links;
- evidence records or criterion-to-evidence links;
- automated verification;
- change-impact analysis;
- artifact import, specialist handoff, or release authorization.

No hosted production deployment or Released state is claimed.
