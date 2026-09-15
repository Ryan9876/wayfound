# Increment 2 — AI development console

**Status:** Validated

## Outcome

The owner can see which AI provider and model Wayfound is using, test LM Studio, Ollama, and an explicitly configured OpenAI connection, select a discovered local model for normal Wayfound AI review, and inspect the actual sanitized request/response exchanges that pass through Wayfound while the AI integration is being developed.

This is temporary development instrumentation. It is not a durable project record and will be removed or disabled when the AI integration is sufficiently stable.

## Scope

This slice adds:

- LM Studio as the default development provider;
- automatic discovery of all reported LM Studio and local Ollama models;
- explicit provider and model selection for development connection tests;
- transient single-user local selection of an LM Studio or Ollama model for normal Wayfound AI-review calls;
- an explicit OpenAI public-provider connection path when `OPENAI_API_KEY` is configured;
- a text connection indicator;
- a terminal-style in-memory traffic viewer;
- request/response and performance metrics;
- trace clearing and bounded retention;
- secret redaction;
- Docker Desktop host-address support without arbitrary provider URLs.

This slice does not yet route durable project AI reviews through OpenAI. The existing durable review provenance boundary remains `lm-studio` or `ollama` until a separate schema and validation slice expands it. If OpenAI is selected in the development console and the owner attempts the existing durable review action, Wayfound must fail visibly rather than silently use OpenAI or silently switch to another provider.

## Development configuration

The console requires all of the following:

- `WAYFOUND_SINGLE_USER_MODE=true`
- `WAYFOUND_LOCAL_TEST=1`
- `WAYFOUND_AI_DEV_CONSOLE=true`

Local provider base URLs may use approved development defaults. When the Wayfound application runs inside Docker Desktop, the package may set:

- `LM_STUDIO_BASE_URL=http://host.docker.internal:1234`
- `OLLAMA_BASE_URL=http://host.docker.internal:11434`

When Wayfound runs directly on the host, loopback defaults remain valid.

OpenAI uses the server-side `OPENAI_API_KEY`. The key must not be returned by an API route, written into the trace, or committed to the repository.

## Provider/model selection

The development selection is intentionally transient and process-local because this console is temporary troubleshooting instrumentation. It is not a project record and is not written to PostgreSQL.

LM Studio is the default. Opening the console discovers available models. Running or loaded models are listed first, but every discovered model remains selectable. An explicit LM Studio or Ollama selection controls subsequent normal Wayfound local AI-review inference while the console is enabled. Restarting Wayfound resets the development selection.

OpenAI may be selected for an explicit connection test. That selection does not widen the durable AI-review schema. A durable project review attempted while OpenAI is explicitly selected fails with a clear local-only provenance message; it does not fall back to LM Studio/Ollama and does not send the durable review to OpenAI.

## Traffic trace

Each captured exchange contains only development diagnostics:

- timestamp;
- operation;
- provider;
- model;
- endpoint without credentials;
- request method;
- sanitized request body;
- HTTP status or network failure;
- bounded sanitized response body;
- elapsed time;
- input/prompt tokens when reported;
- output/completion tokens when reported;
- reasoning tokens when reported;
- total tokens when reported or safely derivable;
- tokens per second when reported or safely derivable;
- time to first token when reported.

Trace retention is bounded in process memory. Restarting Wayfound clears the trace. The trace is never written to project tables and is not evidence.

## Acceptance criteria

1. Given local test mode and the development console are enabled, when the owner opens Wayfound, then a text AI connection indicator is visible.
2. Given LM Studio is available, when provider discovery completes, then LM Studio is the default selectable provider.
3. Given LM Studio reports multiple models, when the console opens, then all reported LLM models are listed and the owner can select one.
4. Given Ollama reports installed or running models, when the console opens, then Ollama is selectable and all reported local models are listed.
5. Given both LM Studio and Ollama are available, then Wayfound does not hide Ollama and does not silently change the explicit owner selection.
6. Given an LM Studio or Ollama model is explicitly selected, when a normal Wayfound local AI review runs, then that exact provider and model are used.
7. Given `OPENAI_API_KEY` is absent, when the console inspects OpenAI, then it shows `Not configured` and sends no OpenAI request.
8. Given `OPENAI_API_KEY` is configured and the owner explicitly opens or selects the OpenAI provider, when model discovery succeeds, then available model identifiers are shown without exposing the key.
9. Given a provider and model are selected, when the owner runs `Test connection`, then the test uses that exact selection.
10. Given a test or instrumented normal AI operation sends a request, when the console trace refreshes, then the terminal view shows the sanitized outbound request and bounded inbound response.
11. Given a provider reports token or timing metrics, when the exchange renders, then the available values are visible.
12. Given a metric is unavailable, when the exchange renders, then Wayfound shows `Not reported` or omits the optional metric instead of inventing a value.
13. Given an API key or authorization value exists, when a trace entry is created, then the secret value is not present in the stored or returned trace.
14. Given the trace reaches its retention limit, when another exchange is recorded, then the oldest trace entry is discarded.
15. Given the owner clears the console, when the trace refreshes, then the in-memory entries are removed without changing project records.
16. Given LM Studio or Ollama fails, then Wayfound does not contact OpenAI unless the owner explicitly selected or tested OpenAI.
17. Given OpenAI is explicitly selected, when the owner requests a durable project AI review, then the request fails visibly before cloud inference rather than silently widening the durable provider boundary or falling back to another model.
18. Given development console configuration is disabled, then the trace/selection API and console surface are unavailable and the existing validated local-review behavior remains unchanged.
19. Given a public-provider health test passes, then Wayfound does not represent the result as verification, validation, release readiness, or authorization for durable cloud project review.

## Validation

Validated at application/test head `8ff850afb99eb6a9e73635b700ae2543086826eb` through CI run 399 (`34922539323`). The focused browser validation exercised LM Studio and Ollama discovery/selection, connection state, request/response tracing, token/performance metrics, selected-model routing for normal local AI review, OpenAI `Not configured` behavior, configured OpenAI discovery/testing with server-side authorization, secret non-disclosure, and the explicit block against durable OpenAI review or silent local fallback.

See [validation/increment-2-ai-development-console.md](validation/increment-2-ai-development-console.md) for the executed evidence and rendered-evidence inspection.

## Removal rule

The development console is intentionally temporary. Remove or disable the traffic viewer after the provider integration has stable automated diagnostics and the owner no longer needs raw request/response visibility for routine debugging. Removing the console must not remove the normal provider connection indicator or supported provider selection behavior if those remain approved product behavior.
