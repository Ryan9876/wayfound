# Increment 2 — Consequential technical requirement validation

**Status:** Validated

**Date:** 2026-09-14

**Validated application head:** `ec9612e2e87c05780558471a9ab9d76246be417b`

**CI run:** [220](https://github.com/Ryan9876/wayfound/actions/runs/34793249123)

## Result

Consequential technical-requirement proposal, exact-revision specialist review of the requirement and its acceptance criterion, and separate owner approval into the canonical requirement model passed real Supabase/PostgreSQL and built Next.js acceptance tests. The complete prior durable regression chain also passed. Both CI jobs completed successfully. Increment 2 remains In progress; this is its eleventh Validated bounded slice.

Exact focused result:

> PASS: consequential technical requirements preserve split authority; exact-revision specialist review covers the requirement and criterion, gates separate owner approval into the canonical requirement model, and blocking/advisory findings, stale revisions, owner-only product requirements, tenant/session/membership violations, direct-table access, duplicate/concurrent requests, injected audit failure, restart/re-login, database interruption/recovery, keyboard access, and desktop/390 px rendering passed.

## Executed evidence

Run 220 applied migration `20260914002000_technical_requirement_authority.sql`. The Supabase security advisor reported `No issues found`. TypeScript, production build, prototype structure, accessibility baseline, and keyboard checks passed.

The durable job passed, in sequence:

1. Durable workspace continuity and owner decisions.
2. Proposed work items and owner-approved product requirements/criteria.
3. Criterion evidence.
4. Proposed artifacts.
5. Artifact acceptance.
6. Assignment-scoped specialist artifact review.
7. Owner work lifecycle.
8. Consequential technical-decision authority.
9. Consequential technical-requirement authority.

The focused suite established:

- Proposal creation leaves the technical requirement proposal `Proposed` and creates no approved requirement or acceptance criterion.
- Proposal create replay returns the original result; changed request reuse fails.
- Unauthorized and cross-tenant proposal creation fails.
- A reviewer code identifies an authenticated specialist without workspace membership.
- Owner self-review is denied.
- Assignment snapshots the exact proposal revision, including title, obligation, proposed technical requirement, proposed acceptance criterion, requested competence, and bounded review question.
- An unassigned specialist cannot read or submit the bounded review.
- `No blocking finding` records qualified specialist judgment but does not auto-approve the requirement.
- `Advisory` does not satisfy the approval gate.
- `Changes required` blocks approval; no owner override exists in this slice.
- The current owner must perform a separate approval action after a qualifying exact-revision review.
- Approval creates exactly one canonical `technical` requirement with authority `owner-after-specialist-review`, status `Approved`, and one canonical acceptance criterion copied from the reviewed revision.
- The approval linkage retains proposal, reviewed revision, assignment, review, reviewer, approving owner, approved requirement, criterion, and approval time.
- The existing owner requirement command continues to create only `product` / `owner` / `Approved` requirements and cannot create a technical requirement.
- A material proposal change, including a criterion change, makes the earlier review stale for approval; a fresh qualifying review of the revised proposal is required.
- Earlier review history remains visible after a revision even before the revised proposal is reassigned.
- Concurrent distinct owner approval requests produce exactly one durable winner.
- Exact duplicate replay returns the original result; changed request reuse fails.
- Injected audit failure rolls back the protected mutation and request result; retry succeeds after the fault is removed.
- Direct private-table operations fail; RLS and protected mutation boundaries remain in place.
- Tenant, membership, assignment, expired-session, signed-out, and revoked-session boundaries fail as applicable.
- Restart and re-login preserve proposal, assignment, review, approval linkage, approved requirement, criterion, and history.
- Another tenant cannot use the owner's records.
- Database interruption renders a recoverable workspace error; recovery restores the same committed records without fixture substitution.
- Existing no-fetch external-reference behavior remains covered by the prior artifact regression chain.

## Rendered review

Run 220 workspace screenshot artifact:

- Name: `workspace-screenshots`
- Artifact ID: `10329021196`
- Digest: `sha256:078657a9c736f69dcc250c1e10d99f7eefb07f3d2c81b06ae531c587e58ef825`
- Size: 31,713,924 bytes
- [Artifact](https://github.com/Ryan9876/wayfound/actions/runs/34793249123/artifacts/10329021196)

The downloaded ZIP digest matched the recorded GitHub digest. The following generated screenshots were inspected directly:

- `technical-requirement-proposed-owner-desktop.png`
- `technical-requirement-proposed-owner-mobile.png`
- `technical-requirement-specialist-reviewed-desktop.png`
- `technical-requirement-specialist-reviewed-mobile.png`
- `technical-requirement-approved-owner-desktop.png`
- `technical-requirement-approved-owner-mobile.png`
- `technical-requirement-database-unavailable.png`

Desktop and 390 px mobile inspection confirmed readable proposal, obligation, proposed criterion, assignment, review conclusion, approval eligibility, approval linkage, and canonical requirement state with no horizontal overflow. The owner and specialist workspaces remain visibly separate. `No blocking finding` is shown as qualified review rather than approval. The approved owner view explicitly states that approved project direction after qualified review does not establish verification, validation, release readiness, or production authorization. The canonical Requirements section shows the approved record as kind `Technical`, authority `Owner after required specialist review`, status `Approved`, with the reviewed acceptance criterion and standard evidence linkage. Earlier stale review history remains visible after revision. The database-unavailable view states that the saved record has not been replaced and provides recovery actions.

Normal UI regression artifact:

- Name: `ui-screenshots`
- Artifact ID: `10328509982`
- Digest: `sha256:0e86006722d6198c8ec88ba15f579ef2e88c867a93ff41ed7768cd80a6b7f7fa`
- Size: 1,588,120 bytes

## Authority and recovery limits

[ADR-0004](../adr/0004-technical-decision-review-and-acceptance.md) supplies the accepted split-authority rule reused by this slice. The final owner action is named approval because the canonical requirement state is `Approved`.

`No blocking finding` is not approval or verification. Specialist review does not establish project direction by itself. Owner approval does not create independent technical verification, product validation, release readiness, release authorization, or production authorization.

The existing owner-only requirement action remains restricted to product/business behavior under owner authority. Consequential technical requirements enter the canonical requirement model only through the separate proposal, exact-revision specialist review, and owner approval path.

Technical-requirement replacement, withdrawal, supersession, deprecation, multiple acceptance criteria, multiple mandatory specialist disciplines, formal review disputes/waivers, requirement-to-work or requirement-to-decision links, evidence freshness, explicit verification decisions, automated verification, release authorization, and production-changing actions remain future scope.

The migration preserves existing product requirements and their criteria. Recovery must retain the split authority model and exact-revision linkage; do not collapse proposal, review, and owner approval into one owner-only or specialist-only state.

Real backend execution used the existing isolated CI environment. No hosted services were provisioned.

CI screenshot artifacts use the repository's seven-day retention policy. The artifact IDs, digests, application head, run, and test source identify the executed evidence; this record does not imply indefinite artifact availability.

## Reconciliation

The slice specification, architecture, delivery plan, README, and local test instructions are reconciled with this behavior. PR #1 remains open, draft, and unmerged. Exact-head CI after documentation reconciliation must be confirmed separately; this record identifies the application acceptance run and does not predict a future run result.
