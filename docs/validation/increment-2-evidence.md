# Increment 2 Slice 5 — Durable criterion evidence validation

**Status:** Validated  
**Date:** 2026-09-13  
**Validated application commit:** `4f67d99078600735f086ae894017481234a5a109`  
**CI run:** 151 — `34778920418`

## 1. Validated outcome

An authenticated workspace owner can record a durable evidence result against an existing acceptance criterion, leave and resume the application, and see the same evidence record again.

The evidence record preserves the approved requirement state. Recording evidence does not create a criterion `Verified`, `Passed`, `Satisfied`, or `Validated` state and does not change the linked requirement from `Approved`.

## 2. Executed validation

The successful CI run executed both the existing durable-workspace regression suite and the evidence-specific acceptance suite against an isolated local Supabase stack.

The existing durable regression suite passed first:

> PASS: real Supabase authentication, atomic workspace, owner-decision, proposed work-item, and owner-approved requirement creation, idempotent retries, tenant isolation, authority boundaries, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.

The evidence-specific suite then passed:

> PASS: durable criterion evidence records preserve requirement approval without creating verification state; idempotency, target integrity, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, keyboard focus, and responsive screenshots passed.

The successful run also passed:

- all five migrations, including `20260913193000_durable_evidence.sql`;
- TypeScript checks;
- production build;
- prototype structure checks;
- accessibility baseline checks;
- keyboard navigation checks;
- the Supabase database security advisor with `No issues found`;
- responsive screenshot capture.

## 3. Evidence behavior proven

The evidence suite proved that:

- one evidence record is linked to an existing acceptance criterion;
- the database derives the linked requirement, release, stage, requirement revision, criterion revision, and recorder actor from durable state;
- the only accepted effects are `Supports`, `Challenges`, and `Inconclusive`;
- concurrent identical retries with the same request key return one durable evidence record;
- reusing a request key with changed input is rejected;
- an unknown criterion is rejected;
- a criterion from another workspace is rejected;
- Owner B cannot list or create evidence in Owner A's workspace;
- anonymous, expired-session, revoked-session, and revoked-membership access cannot read or create protected evidence;
- direct private-table reads and exposed direct-table writes are denied;
- an injected failure during `evidence.recorded` audit insertion rolls back the evidence row, audit event, and idempotency request row;
- the linked requirement remains `Approved` at the same revision;
- the linked acceptance criterion receives no verification-status field;
- same-route UI creation renders the committed evidence immediately;
- application restart and sign-in preserve the evidence identifier and content;
- a database interruption renders a recoverable error and does not replace persisted state with fixtures;
- recovery restores the same evidence data.

## 4. Rendered review

Workspace screenshot artifact:

- name: `workspace-screenshots`;
- artifact ID: `10323969999`;
- digest: `sha256:b130d571c5035993899a1ada762fb35b06b437b607a63d7e0ecc3ea89d62e59a`;
- size: 3,427,430 bytes;
- retention expiry: 2026-09-20.

The artifact contains 18 screenshots, including:

- `saved-evidence-desktop.png`;
- `saved-evidence-mobile.png`;
- `evidence-database-unavailable.png`;
- the prior workspace, decision, work-item, requirement, sign-in, list, and outage views.

Rendered review confirmed that desktop and 390 px mobile views show, without horizontal overflow:

- the linked requirement and acceptance criterion;
- evidence count;
- evidence title;
- effect text;
- result;
- source/provenance;
- recorder label;
- requirement and criterion revision snapshots;
- stage;
- stable evidence identifier;
- the explicit `Verification state unchanged` warning;
- the form for another evidence result.

The database-unavailable view states that the saved record was not replaced and offers a retry. It does not display fixture data as a fallback.

## 5. Earlier failed runs

CI run 148 failed before the evidence harness initialized because the preceding outage-recovery regression left the local Supabase database briefly reported as `unhealthy`. The existing regression suite, migration, build, and security advisor had passed. A bounded readiness wait was added between the two harnesses.

CI run 150 reached the evidence browser flow and failed on a Playwright exact-label lookup for a nested `<select>`. Evidence API, security, authorization, rollback, migration, build, and the previous durable regression suite had already passed. The select received an explicit stable accessible name before run 151.

Neither failure established a product or persistence defect in the evidence model. Run 151 executed the corrected full path successfully.

## 6. Limits of this validation

This validation does not establish:

- criterion pass/fail/satisfied/verified state;
- requirement verification state;
- evidence acceptance or rejection workflow;
- evidence freshness or outdated-evidence calculation;
- evidence supersession or deletion;
- specialist reviewer identity or specialist evidence review;
- file or artifact-backed evidence;
- automatic CI/CD evidence ingestion;
- work-item-to-evidence or decision-to-evidence links;
- automated verification;
- change-impact analysis;
- release readiness or production release authorization;
- hosted or production Supabase provisioning.

Those capabilities remain outside this bounded slice. Broader Increment 2 remains **In progress**.
