# Wayfound

**Know the next step.**

Wayfound is a software-delivery guidance and coordination workspace for capable domain experts. It recommends the next useful action and keeps decisions, artifacts, responsibilities, and verification evidence connected from discovery through maintenance.

## Current state

Increment 1 is **Validated** at application commit `4cbc8fd`; see the [validation record](docs/validation/increment-1.md). Increment 2 is **In progress** under [accepted ADR-0002](docs/adr/0002-durable-workspace-identity.md).

Three Increment 2 slices are **Validated**:

- authenticated create/list/open/resume workspace continuity at application commit `603f028`, [validation record](docs/validation/increment-2-durable-workspace.md);
- owner-authorized durable product/business decisions at application commit `548f1bb`, [validation record](docs/validation/increment-2-decisions.md);
- owner-owned durable proposed work items at application commit `1f2a1c9`, [validation record](docs/validation/increment-2-work-items.md).

The repository does not claim production readiness or release.

Implemented and validated durable behavior includes isolated Supabase authentication; PostgreSQL-backed workspace create/list/open/resume; membership isolation; Proposed release and 15-stage state; transactional/idempotent workspace creation; accepted owner decisions with explicit authority; and proposed work items with owner, stage, outcome, completion condition, expected evidence, rollback, tenant isolation, and restart/resume behavior.

The owner-decision action is limited to product-scope and business decisions. Consequential technical decisions require qualified specialist review and are not accepted through that action. Work-item creation records planned work only and does not start execution or claim implementation, review, completion, or verification.

Not yet implemented or validated as broader product behavior:

- hosted authentication/database provisioning;
- specialist-review decision workflow;
- work-state transitions, collaborator/specialist assignment, dependencies, or requirement links;
- durable requirement, artifact, evidence, and maintenance record workflows;
- artifact import or versioning;
- specialist connector integrations;
- automated verification ingestion;
- production deployment actions.

The persisted workspace is at `/workspaces`; sign-in is at `/sign-in`. Borrow Desk remains illustrative at `/demo` and the existing prototype routes. See [local development](docs/LOCAL_DEVELOPMENT.md) for an isolated Supabase setup.

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
