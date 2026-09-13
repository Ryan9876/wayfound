# Wayfound

**Know the next step.**

Wayfound is a software-delivery guidance and coordination workspace for capable domain experts. It recommends the next useful action and keeps decisions, artifacts, responsibilities, and verification evidence connected from discovery through maintenance.

## Current state

Increment 1 is **Validated** at application commit `4cbc8fd`; see the [validation record](docs/validation/increment-1.md). Increment 2 implementation is **Blocked** on the [proposed identity and persistence decision](docs/adr/0002-durable-workspace-identity.md).

The repository contains the first prototype vertical slice. It uses illustrative Borrow Desk fixture data and does not claim production readiness.

Implemented in this slice:

- responsive application shell;
- desktop and mobile navigation;
- Overview dashboard with next-action guidance;
- 15-stage Journey view;
- representative Work, Handoffs, Records, and Release & Care views;
- Wayfound visual tokens and prototype logo mark.

Not implemented in this slice:

- authentication;
- persistent database storage;
- artifact import or versioning;
- specialist connector integrations;
- automated verification ingestion;
- production deployment actions.

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
