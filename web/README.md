# Wayfound Web — M2 local-first scaffold

This directory is the Next.js/TypeScript application scaffold for the first durable Wayfound slice. The validated dependency-free prototype remains in the repository root `app/` directory while durable behavior is moved here in bounded slices.

## Default M2 proof path

1. Wayfound starts locally with no account requirement.
2. The installation creates/reuses one stable local human Actor.
3. The Actor creates a private project through the Wayfound server command boundary.
4. Project state is stored in local SQLite at `~/.wayfound/wayfound.sqlite` by default.
5. An accepted answer creates an immutable Answer Revision and current Record Revision in one transaction.
6. A requirement/work candidate stays transient until `Propose`.
7. `Propose` snapshots an exact Artifact Revision and exact source Record Revision links.
8. A stale project version or stale source revision is rejected.
9. M2 intentionally has no `Approve` command.

## Run locally

No Clerk, Neon, Vercel, or LLM provider is required.

```bash
npm install
npm test
npm run test:local
npm run typecheck
npm run dev
```

Open the local URL printed by Next.js. The first project action creates `~/.wayfound/wayfound.sqlite`. Set `WAYFOUND_LOCAL_DB` if you want the database somewhere else.

## Local AI

AI is off by default. Ollama and LM Studio are first-class local options through their OpenAI-compatible localhost endpoints.

Ollama example:

```bash
export WAYFOUND_AI_PROVIDER=ollama
export WAYFOUND_AI_MODEL=qwen3-coder:30b
npm run dev
```

LM Studio example:

```bash
export WAYFOUND_AI_PROVIDER=lmstudio
export WAYFOUND_AI_MODEL=<model-id>
npm run dev
```

## Optional external AI

External OpenAI-compatible providers are opt-in. Wayfound refuses a non-loopback AI endpoint unless `WAYFOUND_ALLOW_EXTERNAL_AI=true` is deliberately set. Keep API keys local and never commit them.

See `.env.example` for the complete configuration shape.

## Optional hosted mode

The existing Clerk/PostgreSQL adapters remain available for a future hosted/multi-user mode. They are not required for M2 local operation and are not the default authority path.
