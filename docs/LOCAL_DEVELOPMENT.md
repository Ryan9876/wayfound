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

Run `npm run build` and `npm run test:workspace` for the full isolated acceptance test. The test provisions disposable identities, exercises real PostgreSQL and Supabase Auth, starts/restarts the built app on port 3100, and briefly pauses the local database container. Use a disposable local stack without other development activity. Screenshots are written under `artifacts/workspace`. CI runs this in a fresh runner.

## Failure and recovery

Database or authentication failures do not fall back to Borrow Desk. The persisted UI shows a recoverable error. Creation uses a request key and one database transaction; retry with the same details to recover an ambiguous response without duplication. Existing committed records remain authoritative.

Application rollback means deploying the previous application version while retaining the database. Do not drop tables to roll back the UI. Before any hosted or production environment exists, define backup, restore validation, hosting ownership, region, and secrets. This slice makes no production restore claim.
