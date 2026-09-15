# Wayfound local test quick start

Use this path when you already have Git, Node.js 22+, npm, and Docker Desktop installed and want to refresh Wayfound quickly as the test branch changes.

## Normal test loop

From the Wayfound repository on `work/foundation-ui`:

```bash
npm run local:refresh
```

The refresh command checks that your Git working tree is clean, fast-forwards the test branch, installs dependencies only when the lockfile requires it, starts the existing local Supabase Docker stack, applies pending local migrations without resetting data, starts Wayfound, and opens:

```text
http://127.0.0.1:3000/workspaces
```

Normal refresh **preserves local project data** and Docker volumes. It does not run `supabase db reset --local`.

After the first refresh, these commands are available:

```bash
npm run local:start
npm run local:status
npm run local:stop
npm run local:reset
```

- `local:start` starts the current checkout without fetching Git changes.
- `local:status` shows application/backend state without showing credentials.
- `local:stop` stops Wayfound and the local Supabase services while preserving local Docker volumes.
- `local:reset` intentionally recreates the isolated local database and requires destructive confirmation.

## First local owner

On a brand-new empty local Supabase stack, the launcher can create one local Wayfound test owner automatically. Its generated credentials are stored only under the ignored `.wayfound/` runtime directory with restrictive file permissions.

If an existing local Supabase stack already contains Auth users but the launcher does not have a matching saved owner, normal refresh stops and preserves those users. It does not delete or replace them. You can provide the existing test owner's credentials in your shell or choose the explicit reset path.

## AI testing

The quick test environment enables the validated development AI console.

- **LM Studio** is the default development provider at `http://127.0.0.1:1234`.
- **Ollama** is selectable at `http://127.0.0.1:11434`.
- **OpenAI** remains optional and explicit. If you provide `OPENAI_API_KEY` through your shell or ignored local environment configuration, Wayfound can use the already-validated public-provider connection-test path.

Wayfound does not silently send local work to OpenAI when a local provider fails. Durable project AI review remains local-only until a later approved provenance/schema change.

The development console shows text connection state, provider/model selection, actual sanitized request/response traffic, token counts when reported, response timing, and other available performance metrics. It does not display API keys or authorization headers, and its trace is not project evidence.

## Safe Git behavior

`local:refresh` refuses to update a dirty working tree and uses a fast-forward-only update. It does not hard-reset, force-checkout, or discard local commits/files.

## If startup fails

Check:

```text
.wayfound/app.log
```

Then run:

```bash
npm run local:status
```

If Docker is not running, start Docker Desktop and retry. Use `local:reset` only when you intentionally want to destroy the isolated local Wayfound test database.

This package is a development/test convenience. Starting it does not make the project Verified, Validated, release-ready, or Released.
