# Local refresh test package

**Status:** In progress

## Outcome

A developer who already has Git, Node.js 22+, npm, and Docker can update and run the current Wayfound test branch from one command without an administrator install and without rebuilding the local test environment by hand.

The normal refresh path must preserve local Wayfound project data. A separate reset path may intentionally recreate the local database only after explicit confirmation.

## Architecture decision for this package

Keep the Next.js application as a host process for this local test package. Continue to use the existing Supabase CLI local stack, which runs PostgreSQL, Auth, Kong, and PostgREST in Docker.

Do not put the Wayfound application itself in a Docker container in this slice. The existing automatic single-user session boundary requires loopback HTTP for both `APP_ORIGIN` and `SUPABASE_URL`. Keeping the app on the host preserves that validated security boundary and avoids widening ADR-0006 only to create a local convenience package.

This is a development/test packaging decision. It is not a production hosting decision and does not establish release readiness.

## Commands

The package provides these repository commands:

- `npm run local:refresh` — fast-forward the test branch, install dependencies only when required, start the existing local Supabase Docker stack, apply pending migrations without resetting data, ensure the configured local owner remains usable, restart Wayfound, and open the workspace.
- `npm run local:start` — start the same local test environment without fetching Git changes.
- `npm run local:status` — report local app/backend state without showing credentials.
- `npm run local:stop` — stop the Wayfound app and local Supabase stack while preserving Docker volumes.
- `npm run local:reset` — explicitly reset the isolated local database, re-seed the local owner, and restart the app after a destructive confirmation.

## Refresh behavior

`local:refresh` must:

1. Require Node.js 22 or later.
2. Require Docker to be running.
3. Refuse an automatic Git update if the working tree contains uncommitted changes.
4. Update only by a normal fetch plus fast-forward merge of the configured test branch. It must not hard-reset, force-checkout, or discard local commits.
5. Run `npm ci` only when dependencies are missing or `package-lock.json` changed since the last successful local setup.
6. Start the existing Supabase CLI stack with the repository's bounded service set.
7. Apply pending local migrations without using `db reset` on the normal refresh path.
8. Preserve the current local database and Docker volumes.
9. Preserve the configured local owner identity. If the launcher cannot safely determine ownership, it must fail rather than silently replace an existing local identity.
10. Start Wayfound at `http://127.0.0.1:3000` with single-user mode, automatic authenticated owner session, local-test mode, and the development AI console enabled.
11. Keep LM Studio at `http://127.0.0.1:1234` and Ollama at `http://127.0.0.1:11434` for the host-run application.
12. Leave OpenAI optional. A server-side `OPENAI_API_KEY` supplied by the shell or ignored local environment file may be used by the already-approved explicit public-provider test path.
13. Never print the local owner password, Supabase secret/service key, OpenAI key, authorization header, or another configured secret.
14. Write application runtime logs to an ignored local path so startup failures are diagnosable.

## Local owner handling

The launcher stores generated local-test credentials only in an ignored local runtime directory with restrictive file permissions.

On a new empty local Supabase stack, the launcher may create the one test owner automatically. If an existing local stack contains identities and the launcher has no matching saved owner configuration, it must stop and preserve the existing identities. The owner can then either provide explicit existing test credentials or choose the separate reset command.

Normal refresh must not delete local Auth users or project records as a convenience action.

## Reset behavior

`local:reset` is destructive only to the isolated loopback Supabase test stack. It must require an explicit confirmation unless an explicit automation flag is supplied. It may then run the existing local database reset, seed exactly one local owner, and restart Wayfound.

The reset command must not operate against a hosted or non-loopback Supabase endpoint. Existing local guard code remains authoritative.

## AI behavior

The package enables the validated development AI console by default.

- LM Studio remains the default development provider.
- LM Studio and Ollama remain selectable.
- The connection indicator and terminal-style trace remain visible when the console is enabled.
- OpenAI remains explicit and optional.
- Local failure must not cause cloud fallback.
- Durable project AI review remains local-only until a later approved provenance/schema change.

## Acceptance criteria

1. Given a clean checkout with supported prerequisites, when the developer runs `npm run local:refresh`, then the command can prepare and start the local test environment without an administrator install.
2. Given the repository contains uncommitted changes, when `local:refresh` would update Git, then it refuses before changing the checkout.
3. Given the remote test branch advanced linearly, when `local:refresh` updates it, then the local branch advances by fast-forward only.
4. Given dependencies are already installed for the current lockfile, when the developer refreshes, then the launcher does not run an unnecessary `npm ci`.
5. Given the local Supabase stack already contains project data, when the developer refreshes, then pending migrations are applied without `db reset` and the existing data remains present.
6. Given a new empty local stack, when the developer starts the package for the first time, then one local owner can be created without printing its password.
7. Given an existing local stack has identities but no matching saved launcher owner, when the developer refreshes, then the launcher preserves those identities and stops with a recovery instruction.
8. Given the local test environment starts, when the developer opens `http://127.0.0.1:3000/workspaces`, then the authenticated single-owner workspace is available without interactive login.
9. Given LM Studio or Ollama is running on the host, when Wayfound starts through the package, then the validated AI console can detect the provider on its existing fixed loopback port.
10. Given an OpenAI key is configured locally, when Wayfound starts through the package, then the existing explicit OpenAI development test path can use it without the launcher printing or persisting the key in project files.
11. Given the developer runs `local:stop`, then the application and local Supabase services stop while local Docker volumes remain available for the next refresh.
12. Given the developer requests `local:reset`, then the command requires destructive confirmation and can operate only on the isolated local Supabase stack.
13. Given a startup operation fails, then the command reports the failed step and the local application-log path rather than silently continuing.
14. Given this package is used successfully, then no requirement, evidence, verification, validation, release-readiness, or Released project state changes merely because the local environment started.

## Validation boundary

The repository can validate the launcher's command plan, fixed local endpoints, non-destructive refresh contract, explicit reset contract, ignored runtime state, and package scripts in CI.

A Mac execution using Docker Desktop is still required before this package is marked fully Validated for the intended local developer experience. Until that execution is recorded, this package remains **In progress** even if repository CI is green.
