# Increment 2 — Local AI connection discovery

**Status:** Implementing

## Outcome

Wayfound single-user mode automatically discovers supported local AI runtimes, shows an explicit connection state, and provides a bounded local inference health test without requiring the owner to configure a provider URL for the normal local test path.

This slice establishes provider discovery, visible connection state, and a non-durable inference health check. It does not make AI output authoritative and does not yet claim a durable AI-review workflow.

## Supported local providers

Wayfound probes loopback-only default endpoints:

- LM Studio: `http://127.0.0.1:1234`
- Ollama: `http://127.0.0.1:11434`

LM Studio discovery uses its native `GET /api/v1/models` endpoint so Wayfound can distinguish available models from loaded model instances. Its health test uses the native `POST /api/v1/chat` endpoint so Wayfound can use provider-reported input, output, reasoning, generation-rate, and time-to-first-token metrics.

Ollama discovery uses `GET /api/ps` for running models and `GET /api/tags` for installed models. Its health test uses `POST /api/chat` with streaming disabled.

No public or cloud AI provider is attempted by this discovery or health-test path.

## Selection rule

When more than one local runtime is available, Wayfound selects the first usable runtime in this order:

1. LM Studio with a loaded LLM.
2. Ollama with a running model.
3. LM Studio reachable with an available LLM but no loaded instance.
4. Ollama reachable with an installed model but no running model.
5. No local AI provider detected.

Within a provider, a model whose name contains `glimmer` is preferred when present; otherwise the first returned LLM/model is shown.

## Visible states

The signed-in single-user interface shows a text label and a color-independent state:

- `Connected` — a supported local runtime is reachable and has a loaded/running model.
- `Ready` — a supported local runtime is reachable and a model is known, but it may need to be loaded or started.
- `Offline` — neither supported loopback runtime responded within the discovery timeout.

The indicator also identifies the selected provider and model when known. Color may reinforce state but must not be the only status signal.

## Local AI health test

When a provider and model are known, the connection control exposes a `Test AI` button.

The test sends a minimal deterministic prompt asking the selected local model to return the marker `WAYFOUND_LOCAL_AI_OK`. The test passes only when a completed model response contains that marker. The test does not create or modify project records.

The health check tests basic inference connectivity, not reasoning quality. For Glimmer through LM Studio, Wayfound explicitly requests reasoning `off`; for Ollama, Wayfound sends `think: false`. This prevents a reasoning model from consuming the small health-check output budget before it reaches the deterministic final response. The output budget remains bounded at 128 tokens.

The result shows:

- pass or fail;
- provider and model;
- end-to-end response time measured by Wayfound;
- input/prompt tokens when reported by the provider;
- output/completion tokens when reported by the provider;
- reasoning tokens when LM Studio reports them;
- total tokens, calculated from provider-reported input and output counts;
- generation tokens per second when reported or derivable from provider timing data;
- time to first token when LM Studio reports it;
- the short final model response and a plain-English result detail.

A metric that the provider does not report must be labeled `Not reported` or omitted when optional; Wayfound must not invent token counts or timing data.

The inference request uses a bounded timeout. A timeout, HTTP failure, malformed response, exhausted output budget without a final response, or incorrect marker produces a visible failed result and does not cause cloud fallback.

## Security and authority boundary

- The health-test route requires an authenticated Wayfound owner session.
- The route is available only while single-user mode is active.
- Provider targets are fixed loopback addresses; the browser does not receive or choose an arbitrary provider URL.
- The test result is transient UI state and is not durable project evidence.
- A successful health test proves only that Wayfound can obtain a basic inference response from the selected local model. It does not establish model quality, project correctness, verification, validation, release readiness, or production authorization.

## Failure behavior

- Discovery failures must not block the workspace from loading.
- Provider probes use a short timeout and return an `Offline` state on network/process failure.
- A local provider requiring authentication may be reported as reachable but unavailable for use; Wayfound must not bypass authentication.
- Wayfound must not silently switch to a public/cloud provider when local discovery or testing fails.
- No discovered or tested model may approve project direction, verification, validation, release readiness, or production actions.

## Acceptance criteria

1. Given LM Studio is running on its default loopback port with Glimmer loaded, when a signed-in owner opens Wayfound in single-user mode, then the interface shows `Connected`, `LM Studio`, and the Glimmer model name.
2. Given LM Studio is not running and Ollama has a running model, when the owner opens Wayfound, then the interface shows `Connected`, `Ollama`, and the running model name.
3. Given a supported provider responds and has a known model that is not currently loaded/running, when the owner opens Wayfound, then the interface shows `Ready` and allows a test attempt that may cause the local runtime to load the selected model.
4. Given neither provider responds, when the owner opens Wayfound, then the interface shows `Offline`, the AI test is unavailable, and the rest of the workspace remains usable.
5. Given both providers are running with usable models, when discovery completes, then LM Studio is selected and the other provider is not silently substituted.
6. Given local discovery fails, when Wayfound determines AI state, then it does not send a request to a public/cloud AI endpoint.
7. Given a provider and model are selected, when the owner presses `Test AI`, then Wayfound performs one bounded local inference request using the selected provider and model.
8. Given Glimmer is selected in LM Studio, when the owner presses `Test AI`, then Wayfound uses LM Studio native chat with reasoning disabled for the health-check request.
9. Given the model returns `WAYFOUND_LOCAL_AI_OK`, when the test completes, then the interface shows `Passed`, response time, input tokens, output tokens, total tokens, and provider performance metrics when available.
10. Given LM Studio reports reasoning-token or time-to-first-token metrics, when the result renders, then those metrics are shown without exposing reasoning text.
11. Given a provider omits a token or timing metric, when the result renders, then the interface shows `Not reported` or omits an optional metric rather than inventing a value.
12. Given the model does not return the expected marker or the inference request fails, when the test completes, then the interface shows `Failed` with a plain-English reason and does not switch to a cloud provider.
13. Given an unauthenticated request calls the health-test route, then Wayfound rejects it without starting local inference.
