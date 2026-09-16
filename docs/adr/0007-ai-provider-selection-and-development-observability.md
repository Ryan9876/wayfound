# ADR-0007 — AI provider selection and development observability

**Status:** Accepted  
**Date:** 2026-09-14  
**Decision owner:** Product owner

## Decision

Wayfound will keep a local-first AI provider model while adding explicit provider and model selection.

LM Studio is the default provider for the local test experience. Wayfound will discover supported LM Studio and Ollama models and allow the owner to select an available model. A public/cloud provider may also be configured, but Wayfound must never switch from local AI to a public provider because a local provider failed.

The first public provider boundary is OpenAI. OpenAI credentials remain server-side and are not sent to the browser. Wayfound may query the public provider only after the owner explicitly opens or uses the provider-selection or connection-test surface, or after the owner explicitly selects that provider for an approved AI operation.

During active development, Wayfound will expose a development-only AI console. The console shows connection state, selected provider and model, bounded request/response traffic, and performance metrics. This console is troubleshooting instrumentation, not a project record or verification surface.

## Context

ADR-0005 established a local-first provider boundary and explicitly named public/cloud configuration as a reconsideration trigger. The product owner has now requested both local and public LLM connectivity, with LM Studio as the default, automatic model discovery, explicit model selection, a clear connection indicator, and a temporary terminal-style traffic window for learning and debugging.

The current implementation already probes LM Studio and Ollama, shows `Connected`, `Ready`, or `Offline`, and exposes a bounded local health test with token and timing diagnostics. The durable AI-review schema currently accepts only `lm-studio` and `ollama` provenance. Public-provider connectivity therefore enters in a bounded development slice before any durable project-review path is allowed to write public-provider provenance.

## Consequences

### Provider behavior

- LM Studio is the default provider in the development/test experience.
- Wayfound discovers LM Studio models and Ollama models automatically.
- The owner can select a discovered provider and model.
- Ollama remains selectable even when LM Studio is available.
- OpenAI is visible only as an explicit public-provider choice.
- OpenAI requests require a server-side `OPENAI_API_KEY`.
- A missing OpenAI key is shown as `Not configured`; it is not treated as a local-AI failure.
- Local-provider failure must not trigger an OpenAI request.
- Public-provider use must be visible before a prompt is sent.
- No provider may approve, verify, validate, release, or authorize production activity.

### Docker and local runtime addressing

The local development boundary may use either loopback addresses or Docker Desktop host bridging. Supported local targets are limited to explicit development addresses such as `127.0.0.1`, `localhost`, and `host.docker.internal`. Wayfound must not accept an arbitrary user-supplied local provider URL in this slice.

### Development AI console

The development AI console is enabled only by explicit local-test configuration. It must:

- show text connection state and not rely on color alone;
- show the provider and model used for each exchange;
- show timestamp, operation, endpoint, HTTP result, and elapsed time;
- show the sanitized request body that Wayfound sent;
- show the bounded response body that Wayfound received;
- show input, output, reasoning, and total token counts when reported;
- show generation rate and time to first token when reported;
- show `Not reported` rather than inventing unavailable metrics;
- retain only a bounded in-memory development trace;
- allow the owner to clear the trace;
- exclude authorization headers, API keys, passwords, access tokens, refresh tokens, and other configured secrets;
- remain separate from durable project records and objective evidence.

The console may display project text that the owner explicitly caused Wayfound to send to an AI provider. This is intentional development visibility. The trace must not be persisted to the Wayfound database.

### Durable AI review boundary

The existing durable AI-review path remains local-only until a separate migration expands its accepted provider provenance and corresponding validation proves that cloud review preserves the same authority, privacy, failure, and audit boundaries.

A successful public-provider connection test does not authorize durable cloud AI review by itself.

## Security and privacy

- Provider credentials stay server-side.
- The browser must not receive `OPENAI_API_KEY` or provider authorization headers.
- The development trace sanitizes secret-bearing fields before they enter the in-memory buffer.
- Provider endpoints are fixed or validated against the approved development boundary.
- Public-provider requests are explicit and visible; there is no silent cloud fallback.
- Development trace data is transient and must not be treated as project evidence.

## Failure behavior

- If LM Studio is unavailable, Wayfound shows the local state and does not contact OpenAI automatically.
- If Ollama is unavailable, Wayfound shows the provider state and does not contact OpenAI automatically.
- If OpenAI is not configured, Wayfound shows `Not configured`.
- If provider model discovery fails, the workspace remains usable.
- If an inference request fails, the console records a bounded sanitized failure exchange when development tracing is enabled.

## Reconsideration trigger

Revisit this ADR when the development console is removed, when another public provider is added, when arbitrary provider URLs are proposed, or when public-provider provenance is introduced into durable AI-review records.
