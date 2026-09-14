# Local durable workspace development

The development slice uses an isolated Supabase stack. No hosted service is required for these tests. Requirements: Node.js 22+, npm, and Docker with enough capacity for PostgreSQL, Auth, Kong, and PostgREST.

```bash
npm ci
npx supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

Supabase applies the committed migration on a fresh local stack. For an existing disposable development database, `npx supabase db reset --local` recreates local data. Do not use reset with a linked or hosted database.

Copy `.env.example` to `.env.local`. Set `SUPABASE_PUBLISHABLE_KEY` from the local `npx supabase status` output (local legacy anon key is also supported). Keep `APP_ORIGIN` equal to the browser origin. Never put a service/secret key in application configuration.

Create a local account using environment variables in your terminal:

```bash
export WAYFOUND_SEED_EMAIL='owner@example.test'
# Set WAYFOUND_SEED_PASSWORD to a unique development password, at least 12 characters.
npm run seed:local
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/sign-in`. The seed command refuses non-loopback endpoints, preserves existing users, and inserts no fixture project records. Public signup is disabled for this slice. Passwords are not committed or printed by the tooling.

## Single-user local test mode

Use the active first-version single-user experience when one human owner is testing Wayfound without another human collaborator or specialist account.

Set `WAYFOUND_SINGLE_USER_MODE=true` in `.env.local`, then seed exactly one local owner identity:

```bash
export WAYFOUND_SEED_EMAIL='owner@example.test'
# Set WAYFOUND_SEED_PASSWORD to the local test password, at least 12 characters.
npm run seed:single-user-local
npm run dev -- --hostname 127.0.0.1
```

`seed:single-user-local` is intentionally destructive only inside the isolated loopback Supabase stack. It removes other local Auth users, creates or retains the requested owner identity, refreshes that local owner's password, and inserts no project records. The command inherits the loopback-only guard from `scripts/local-backend.mjs` and cannot target a hosted Supabase endpoint.

In single-user mode, normal workspace navigation hides human specialist review and handoff entry points. Existing validated specialist-review database structures and regression tests remain in the repository as historical capability; they are not part of the active first-version user flow. AI guidance remains advisory and cannot independently approve, verify, validate, release, or authorize production actions.

Run `npm run build` and `npm run test:workspace` for the full isolated acceptance test. The test provisions disposable identities, exercises real PostgreSQL and Supabase Auth, starts/restarts the built app on port 3100, and briefly pauses the local database container. Use a disposable local stack without other development activity. Screenshots are written under `artifacts/workspace`. CI runs this in a fresh runner.

## Failure and recovery

Database or authentication failures do not fall back to Borrow Desk. The persisted UI shows a recoverable error. Protected mutations use request keys and database transactions; retry with the same normalized request to recover an ambiguous response without duplication. Existing committed records remain authoritative.

Application rollback means deploying the previous application version while retaining the database. Do not drop tables to roll back the UI. Before any hosted or production environment exists, define backup, restore validation, hosting ownership, region, and secrets. These development slices make no production restore claim.

## Owner work lifecycle regression

After building, run `npm run test:work-lifecycle` on the same isolated disposable stack. CI runs this after the complete prior durable regression chain. It exercises owner approval, start, block, resume, concurrency, separation of duties, transactional rollback, live-session/revocation denial, browser stale-state errors, restart/re-login, and database interruption/recovery. Screenshots include focused Work sections at desktop and 390 px mobile widths.

## Consequential technical-decision regression

After building, run `npm run test:technical-decisions` on the same isolated disposable stack. CI runs this after the prior durable regression chain.

The focused suite exercises:

- owner proposal without automatic decision acceptance;
- exact-revision specialist assignment and review;
- reviewer-code addressing without workspace membership;
- owner self-review denial;
- all three specialist conclusions;
- separate owner acceptance only after `No blocking finding`;
- stale-review invalidation after a material proposal revision;
- concurrent one-winner acceptance and idempotent replay/conflict handling;
- direct-table, tenant, session, membership, and assignment denial;
- transactional audit-failure rollback and retry;
- restart/re-login persistence;
- database interruption/recovery without fixture substitution;
- keyboard access and desktop/390 px responsive rendering.

The technical-decision suite does not establish verification, validation, release readiness, or production authorization from the owner acceptance action.

## Consequential technical-requirement regression

After building, run `npm run test:technical-requirements` on the same isolated disposable stack. CI runs this after the technical-decision authority suite and the complete prior durable regression chain.

The focused suite exercises:

- owner proposal without automatic requirement approval or canonical criterion creation;
- exact-revision specialist assignment that snapshots the requirement statement and proposed acceptance criterion;
- reviewer-code addressing without workspace membership and owner self-review denial;
- all three specialist conclusions;
- separate owner approval only after `No blocking finding`;
- canonical approved requirement creation as kind `technical`, authority `owner-after-specialist-review`, status `Approved`, with exactly one reviewed acceptance criterion;
- preservation of the existing owner-only product requirement command as kind `product` and authority `owner`;
- stale-review invalidation after a material requirement or criterion revision and fresh-review recovery;
- concurrent one-winner approval and idempotent replay/conflict handling;
- direct-table, tenant, session, membership, and assignment denial;
- transactional audit-failure rollback and retry;
- restart/re-login persistence and visible prior review history;
- database interruption/recovery without fixture substitution;
- keyboard access and desktop/390 px responsive rendering.

A technical-requirement specialist review is qualified judgment only. `No blocking finding` gates a separate owner approval action; it is not approval or verification. Owner approval records required technical project direction and does not establish verification, validation, release readiness, release authorization, or production authorization.
