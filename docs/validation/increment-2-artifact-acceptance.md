# Increment 2 — Artifact acceptance validation

**Status:** Validated  
**Date:** 2026-09-13  
**Validated repository head:** `3ca0ea4a1fe931e80a9466250915efe623827847`  
**CI run:** [164](https://github.com/Ryan9876/wayfound/actions/runs/34781772865)

## Result

The owner artifact-acceptance slice is **Validated** against isolated local Supabase and the built Next.js application.

Exact acceptance-suite result:

> PASS: explicit owner artifact acceptance selects one proposed version as accepted project direction without implying specialist review or verification; authority confirmation, target integrity, idempotency, invalid-state rejection, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, external-reference non-fetch, keyboard focus, and responsive screenshots passed.

The normal CI job and durable CI job both completed successfully.

## Evidence executed

Run 164 applied all seven durable migrations, including `20260913204500_artifact_acceptance.sql`, and then passed:

- production build and TypeScript checks;
- prototype structure and accessibility baseline;
- keyboard and responsive rendering checks;
- Supabase security advisor with `No issues found`;
- the complete durable workspace/decision/work-item/requirement regression suite;
- the criterion-evidence regression suite;
- the proposed-artifact regression suite with acceptance metadata present but null for proposed records;
- the artifact-acceptance-specific suite.

The acceptance suite proved:

- explicit owner-authority confirmation is required;
- acceptance targets one exact artifact/version pair;
- unknown, cross-artifact, and cross-workspace targets are rejected;
- version lifecycle changes from `Proposed` to `Accepted` only after the explicit action;
- the artifact accepted-version pointer, accepting actor, and acceptance time are stored;
- artifact and version revisions increment on acceptance;
- the release lifecycle is unchanged;
- duplicate identical acceptance requests are idempotent;
- changed duplicate request payloads are rejected;
- a new request cannot accept the already accepted version again;
- non-member, anonymous, expired-session, signed-out, revoked-session, and revoked-membership acceptance paths are denied;
- direct client table reads/writes cannot bypass the acceptance transaction;
- an injected `artifact.accepted` audit failure rolls back lifecycle, accepted-version pointer, revisions, audit state, and request state;
- restart/resume preserves the accepted version and acceptance metadata;
- database interruption shows the recoverable saved-record error and recovery restores the same committed accepted state;
- the external reference receives zero requests through create, accept, list, render, restart, and recovery.

## Rendered review

Screenshot artifact:

- name: `workspace-screenshots`
- artifact ID: `10325665033`
- digest: `sha256:e67632b3f9595cb97e0b3193c18c6d1193afa55b556e2fab06e52bb7073c7be8`
- files include `accepted-artifact-desktop.png`, `accepted-artifact-mobile.png`, and `artifact-acceptance-database-unavailable.png`.

Desktop and 390 px mobile review confirmed:

- `Accepted artifact · Version 1` is readable;
- lifecycle `Accepted` is text, not color-only;
- `Accepted project direction` is explicit;
- Product owner authority and acceptance time are visible;
- artifact and version revisions and stable identifiers are visible;
- the external-reference label and URL remain readable;
- the warning states that acceptance does not establish qualified specialist review, technical correctness, verification, validation, release readiness, or production authorization;
- the acceptance action is absent after acceptance;
- no horizontal overflow occurs.

The acceptance-specific database-outage screenshot shows `We could not load your workspace.` and `Your saved record has not been replaced.`; no fixture fallback is presented.

## Validation note

CI run 163 reached successful migration, build, security, workspace, and evidence checks but stopped in the previously validated proposed-artifact harness because that harness asserted that `accepted_version_id` did not exist. The acceptance slice deliberately adds nullable acceptance metadata, so the regression was corrected to assert that all acceptance fields are `null` while a version remains Proposed. No product or persistence defect was identified in run 163. Run 164 executed the corrected full regression chain successfully.

## Limits

This validation does not establish:

- second or later artifact versions;
- changing accepted project direction to a later version;
- superseded/replaced lifecycle behavior;
- file upload or import parsing;
- failed-import or retry history;
- change-summary review before accepting an imported revision;
- specialist-review records;
- evidence freshness or verification decisions;
- production readiness, production deployment, or release authorization.

Those remain outside this bounded slice.