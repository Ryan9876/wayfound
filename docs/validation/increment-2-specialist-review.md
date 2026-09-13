# Increment 2 — Specialist review validation

**Status:** Validated  
**Date:** 2026-09-13  
**Validated repository head:** `fc91a4377e887cada269fb35b2192f5c3efad15b`  
**CI run:** [172](https://github.com/Ryan9876/wayfound/actions/runs/34783422272)

## Result

The assignment-scoped specialist-review slice is **Validated** against isolated local Supabase and the built Next.js application.

Exact specialist-review result:

> PASS: assignment-scoped specialist review records authenticated qualified judgment on the exact accepted artifact version without granting workspace owner authority or creating verification state; target integrity, separation of duties, idempotency, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, external-reference non-fetch, keyboard focus, and responsive screenshots passed.

The normal CI job and durable CI job both completed successfully.

## Evidence executed

Run 172 applied all eight durable migrations, including `20260913211500_specialist_review.sql`, and then passed:

- prototype structure and accessibility baseline;
- TypeScript and optimized production build;
- keyboard and responsive rendering checks;
- Supabase security advisor with `No issues found`;
- the complete workspace/decision/work-item/requirement regression suite;
- the criterion-evidence regression suite;
- the proposed-artifact regression suite;
- the artifact-acceptance regression suite;
- the specialist-review-specific suite.

The focused suite proved:

- an authenticated specialist can obtain a stable reviewer code without receiving workspace membership;
- the reviewer code alone grants no workspace access or owner authority;
- only the current workspace owner can assign a different specialist to the exact currently accepted artifact version;
- self-assignment, unknown reviewer codes, proposed targets, cross-artifact targets, and cross-workspace targets are rejected;
- only the assigned authenticated specialist can see and submit the bounded review;
- an unrelated authenticated user cannot see the assignment;
- the assigned specialist cannot list/open the owner's workspace through membership paths and cannot execute owner decision or artifact-acceptance mutations;
- review submission requires explicit competence confirmation and accepts only `No blocking finding`, `Changes required`, or `Advisory`;
- reviewer actor is derived from the live session;
- the review snapshots artifact and artifact-version revisions;
- recording the review leaves artifact lifecycle, accepted-version pointer, artifact/version revisions, and release state unchanged;
- concurrent identical assignment and review requests are idempotent;
- changed reuse of the same request key is rejected;
- a completed assignment cannot receive a second review;
- owner-membership revocation, expired specialist session, signed-out session, deleted/revoked auth session, and revoked assignment deny protected operations;
- direct private-table access and writes are denied;
- injected `specialist_review.assigned` and `specialist_review.recorded` audit failures roll back the related mutation and request state;
- restart and re-login preserve assignment and review identity/content;
- database interruption renders the recoverable saved-record error, and recovery restores the same committed review;
- the stored external artifact reference receives zero requests through create, accept, assignment, specialist read/review, owner read, restart, and recovery.

## Rendered review

Screenshot artifact:

- name: `workspace-screenshots`
- artifact ID: `10325986439`
- digest: `sha256:6141464cd31ac1cc823991c2980eed8e309a9cb4921bf1aa0ac32300938f6930`
- size: 8,370,094 bytes
- files include `specialist-review-workspace-desktop.png`, `specialist-review-workspace-mobile.png`, `owner-specialist-review-desktop.png`, `owner-specialist-review-mobile.png`, and `specialist-review-database-unavailable.png`.

Desktop and 390 px mobile review confirmed:

- the specialist reviewer code and its non-authorization explanation are readable;
- each assignment shows workspace, artifact, exact version identity, requested competence, review question, and status in text;
- completed reviews show reviewer name, declared competence, conclusion, summary, findings, artifact/version revision snapshots, assignment ID, and review ID;
- the interface states `Review is not verification` and explicitly excludes validation, release readiness, and production authorization;
- the owner view shows the named specialist review directly under the exact accepted artifact version;
- the owner view keeps accepted project direction visually distinct from specialist judgment;
- the specialist review form and owner assignment form remain readable at phone width;
- long UUIDs and reference URLs wrap without horizontal overflow;
- keyboard focus checks passed for all visible interactive controls.

The specialist-review database-outage screenshot shows `We could not load your specialist reviews.` and `Your saved record has not been replaced.`; no fixture fallback is presented.

## Architecture note

ADR-0003 intentionally does not add a `specialist` role to the existing workspace membership table. Earlier owner mutations include authorization through the generic membership predicate, so widening workspace membership before a role-aware owner-authorization migration could grant specialists owner-only mutation access. This slice instead authorizes specialists through an exact stored review assignment tied to the authenticated actor.

That narrower model is part of what run 172 validated: the specialist can review the assigned accepted artifact version but cannot become a general workspace member or execute owner mutations.

## Limits

This validation does not establish:

- public signup, production invitations, email-based reviewer lookup, or account recovery;
- broad specialist workspace membership or collaborator administration;
- reviewer reassignment/removal UI;
- specialist approval of technical requirements or technical decision records;
- automated specialist-tool connectors;
- review freshness or outdated-review calculation;
- verification decisions or automated verification evidence;
- later artifact versions, accepted-version replacement/supersession, or file import;
- release readiness, production deployment, or release authorization.

Those remain outside this bounded slice.
