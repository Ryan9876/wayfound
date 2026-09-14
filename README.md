# Wayfound

**Know the next step.**

Wayfound is a software-delivery guidance and coordination workspace for capable domain experts. It recommends the next useful action and keeps decisions, artifacts, responsibilities, and verification evidence connected from discovery through maintenance.

## Current state

Increment 1 is **Validated** at application commit `4cbc8fd`; see the [validation record](docs/validation/increment-1.md). Increment 2 is **In progress** under [accepted ADR-0002](docs/adr/0002-durable-workspace-identity.md), [accepted ADR-0003](docs/adr/0003-assignment-scoped-specialist-review.md), and [accepted ADR-0004](docs/adr/0004-technical-decision-review-and-acceptance.md).

Ten Increment 2 slices are **Validated**:

- authenticated create/list/open/resume workspace continuity at application commit `603f028`, [validation record](docs/validation/increment-2-durable-workspace.md);
- owner-authorized durable product/business decisions at application commit `548f1bb`, [validation record](docs/validation/increment-2-decisions.md);
- owner-owned durable proposed work items at application commit `1f2a1c9`, [validation record](docs/validation/increment-2-work-items.md);
- owner-approved durable product requirements with one acceptance criterion at application commit `9e2af69`, [validation record](docs/validation/increment-2-requirements.md);
- owner-recorded durable criterion evidence at application commit `4f67d99`, [validation record](docs/validation/increment-2-evidence.md);
- durable proposed artifacts with stable artifact/version identities and external references at application commit `8d36ade`, [validation record](docs/validation/increment-2-artifacts.md);
- explicit owner acceptance of one proposed artifact version as current project direction at repository head `3ca0ea4`, [validation record](docs/validation/increment-2-artifact-acceptance.md);
- assignment-scoped specialist artifact review at application head `fc91a43`, [validation record](docs/validation/increment-2-specialist-review.md);
- owner work approval, start, block, and resume at application head `1c3d8a5`, CI run 179, [validation record](docs/validation/increment-2-work-lifecycle.md);
- consequential technical-choice proposal, exact-revision specialist review, and separate owner acceptance at application head `bb77ce1`, CI run 201, [validation record](docs/validation/increment-2-technical-decisions.md).

The [owner work lifecycle slice](docs/INCREMENT_2_WORK_LIFECYCLE.md) adds explicit approval, start, block, and resume with required reasons, revision checks, and durable history. Only the current workspace owner who owns the work can change its state. The slice does not add work assignment, completion, verification, or technical approval.

The [consequential technical-decision slice](docs/INCREMENT_2_TECHNICAL_DECISIONS.md) implements the split authority accepted in ADR-0004. A current owner records a technical choice proposal, assigns an authenticated specialist by reviewer code to the exact proposal revision, and may separately accept that exact reviewed revision only after a `No blocking finding` conclusion. Specialist review does not auto-accept project direction, and owner acceptance does not claim independent technical verification.

The repository does not claim production readiness or release.

Implemented and validated durable behavior includes isolated Supabase authentication; PostgreSQL-backed workspace create/list/open/resume; owner membership isolation; Proposed release and 15-stage state; transactional/idempotent workspace creation; accepted owner decisions with explicit authority; proposed work items with owner, stage, outcome, completion condition, and expected evidence; approved product requirements with `MUST`/`SHOULD`/`MAY` obligations and stable requirement/criterion identifiers; criterion evidence records with result, source/provenance, `Supports`/`Challenges`/`Inconclusive` effect and revision snapshots; proposed artifact records with stable artifact/version identifiers, version 1, current release/stage, and stored HTTP/HTTPS external references; explicit owner acceptance that changes that exact proposed version to `Accepted` and records the accepted-version pointer, accepting actor, acceptance time, revisions, and audit event; assignment-scoped specialist artifact review with a stable reviewer code, bounded competence/question, authenticated specialist identity, named findings, and artifact/version revision snapshots without granting general workspace membership; and consequential technical-choice proposals with exact-revision specialist review and separate owner acceptance linked to the qualifying review.

The owner-decision action is limited to product-scope and business decisions. Consequential technical decisions are handled through the separate ADR-0004 proposal/review/acceptance path and are not accepted through that action. Work-item creation records planned work only and does not start execution or claim implementation, review, completion, or verification. The owner-requirement action records product or business behavior only; consequential technical implementation requirements remain subject to qualified specialist review and are not yet implemented. An acceptance criterion is stored as a condition and does not count as verification evidence. Recording evidence does not by itself mark the criterion satisfied, passed, verified, or validated and does not change the linked requirement from `Approved`. Recording an artifact creates only version 1 with lifecycle `Proposed`; it does not accept project direction, and Wayfound stores the external reference without fetching the referenced content. Artifact acceptance is a separate explicit product-owner action. Specialist artifact review is a separate authenticated specialist action scoped to one exact accepted artifact version. Technical-decision specialist review is likewise bounded to one exact proposal revision. None of these actions establishes verification, validation, release readiness, or production authorization.

Not yet implemented or validated as broader product behavior:

- hosted authentication/database provisioning;
- specialist review and acceptance flow for consequential technical requirements;
- broad collaborator/specialist membership administration, work completion transitions, work assignment, dependencies, and broader durable record links;
- multiple acceptance-criterion lifecycle;
- second or later artifact versions, accepted-version replacement/supersession, file import, failed-import history, retry history, and change summaries;
- accepted technical-decision replacement or supersession;
- maintenance record workflow;
- evidence freshness/outdated-state handling, specialist evidence review, and explicit verification decisions;
- specialist connector integrations;
- automated evidence or verification ingestion;
- production deployment actions.

The persisted owner workspace is at `/workspaces`; the bounded specialist review workspace is at `/specialist-reviews`; sign-in is at `/sign-in`. Borrow Desk remains illustrative at `/demo` and the existing prototype routes. See [local development](docs/LOCAL_DEVELOPMENT.md) for an isolated Supabase setup.

## Run locally

Requirements:

- Node.js 22 or later
- npm 10 or later

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project records

Read these files before material changes:

1. `AGENTS.md`
2. `docs/PROJECT_CHARTER.md`
3. `docs/PRODUCT_REQUIREMENTS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DELIVERY_PLAN.md`
6. `docs/QUALITY.md`
7. `docs/adr/`

The repository is the Wayfound source of truth. Chat history is not a substitute for project records.
