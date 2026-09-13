# Wayfound

**Know the next step.**

Wayfound is a software-delivery guidance and coordination workspace for capable domain experts. It recommends the next useful action and keeps decisions, artifacts, responsibilities, and verification evidence connected from discovery through maintenance.

## Current state

Increment 1 is **Validated** at application commit `4cbc8fd`; see the [validation record](docs/validation/increment-1.md). Increment 2 is **In progress** under [accepted ADR-0002](docs/adr/0002-durable-workspace-identity.md). Its first authenticated create/list/open/resume slice is **Validated** at application commit `603f028`; see the [durable-workspace validation record](docs/validation/increment-2-durable-workspace.md).

The repository contains the validated fixture-backed foundation prototype and the first validated durable-workspace slice. This state does not claim production readiness or release.

Implemented and validated foundation behavior:

- responsive application shell;
- desktop and mobile navigation;
- Overview dashboard with next-action guidance;
- 15-stage Journey view;
- representative Work, Handoffs, Records, and Release & Care views;
- Wayfound visual tokens and prototype logo mark.

Implemented and validated durable-workspace behavior:

- Supabase authentication for the bounded local/CI slice;
- PostgreSQL-backed create, list, open, and resume workspace flow;
- workspace membership isolation;
- Proposed release with Stage 1 active and all 15 stage records;
- transactional creation, retry protection, and initial audit event;
- recoverable loading, empty, authorization, and database-failure states.

Not yet implemented or validated as broader product behavior:

- hosted authentication/database provisioning;
- decision, work, artifact, evidence, and maintenance record workflows;
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
