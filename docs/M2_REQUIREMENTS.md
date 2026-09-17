# M2 Durable Project Requirements — Reconciliation Draft

**Status:** Approved scope; authoritative `PRODUCT_REQUIREMENTS.md` reconciliation required before merge.

This working specification records the M2 requirements approved by the project owner while the production scaffold is implemented. It does not replace `docs/PRODUCT_REQUIREMENTS.md`; the same requirements MUST be reconciled there before this branch can merge.

## WF-017 — Stable authenticated Actor

Clerk-authenticated hosted actions MUST map the same external subject to one stable internal Wayfound human Actor. Project authorization uses the Wayfound Actor, not Clerk roles. Unauthenticated protected actions are rejected. Age/guardian/consent policy remains a release gate for hosted younger users.

## WF-018 — Private durable project through server authority

An authenticated Actor MUST be able to create and reopen a private project through the Wayfound server authority path. The creator becomes owner; title and starting idea survive browser/session loss; nonmembers cannot read the project; command idempotency prevents duplicate project creation.

## WF-019 — Immutable accepted-answer and Record revisions

Accepting a material answer MUST create an immutable Answer Revision and current Record Revision with an exact trace link in one transaction. The Project version advances. Stale expected versions are rejected. Repeated command IDs do not duplicate revisions.

## WF-020 — Exact-source proposal materialization

Rendering a draft does not persist it. Propose MUST require project authority, snapshot one immutable Artifact Revision, link the exact current source Record Revisions, advance project version, and result only in `proposed`. M2 has no `approved` command or database lifecycle state.

## WF-021 — Wayfound-owned project authorization

Every durable project read/write MUST evaluate Wayfound membership/capabilities at the server boundary. The M2 owner can read/write/propose; nonmembers cannot read or change the project; external identity-provider roles are not project authority; AI/service Actors have no M2 interactive project authority.

## WF-022 — Hosted-data isolation and content-minimal telemetry

Development, preview, and production data environments MUST be explicit and mismatch must fail closed. Ordinary command logs MUST NOT copy project titles, ideas, answers, or artifact text. M2 sends no project content to external AI. Production release with real hosted user content remains blocked until retention, deletion, consent, and age-related requirements are approved.

## M2 validation gate

Before M2 can be marked Validated:

- domain tests pass
- dependency install, TypeScript check, and Next.js production build pass in CI
- PostgreSQL migration and integration tests prove transaction/revision/trace/idempotency/concurrency behavior
- Clerk authentication → stable Actor mapping is exercised in a non-production environment
- browser flow proves create → reopen → save decision → propose without an Approve path
- preview/development data isolation is verified
- migration rollback and backup/restore behavior required by the delivery plan has evidence
- `docs/PRODUCT_REQUIREMENTS.md` and `docs/DELIVERY_PLAN.md` are reconciled to the implemented state
