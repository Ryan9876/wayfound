# Increment 2 — Local AI connection discovery

**Status:** Implementing

## Outcome

Wayfound single-user mode automatically discovers supported local AI runtimes and shows an explicit connection state without requiring the owner to configure a provider URL for the normal local test path.

This slice establishes provider discovery and visible state only. It does not make AI output authoritative and does not yet claim a durable AI-review workflow.

## Supported local providers

Wayfound probes loopback-only default endpoints:

- LM Studio: `http://127.0.0.1:1234`
- Ollama: `http://127.0.0.1:11434`

LM Studio discovery uses its native `GET /api/v1/models` endpoint so Wayfound can distinguish available models from loaded model instances. Ollama discovery uses `GET /api/ps` for running models and `GET /api/tags` for installed models.

No public or cloud AI provider is attempted by this discovery path.

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
- `Ready` — a supported local runtime is reachable, but no model is currently loaded/running.
- `Offline` — neither supported loopback runtime responded within the discovery timeout.

The indicator also identifies the selected provider and model when known. Color may reinforce state but must not be the only status signal.

## Failure behavior

- Discovery failures must not block the workspace from loading.
- Provider probes use a short timeout and return an `Offline` state on network/process failure.
- A local provider requiring authentication may be reported as reachable but unavailable for use; Wayfound must not bypass authentication.
- Wayfound must not silently switch to a public/cloud provider when local discovery fails.
- No discovered model may approve project direction, verification, validation, release readiness, or production actions.

## Acceptance criteria

1. Given LM Studio is running on its default loopback port with Glimmer loaded, when a signed-in owner opens Wayfound in single-user mode, then the interface shows `Connected`, `LM Studio`, and the Glimmer model name.
2. Given LM Studio is not running and Ollama has a running model, when the owner opens Wayfound, then the interface shows `Connected`, `Ollama`, and the running model name.
3. Given a supported provider responds but has no loaded/running model, when the owner opens Wayfound, then the interface shows `Ready` and tells the owner that a model must be loaded or started.
4. Given neither provider responds, when the owner opens Wayfound, then the interface shows `Offline` and the rest of the workspace remains usable.
5. Given both providers are running with usable models, when discovery completes, then LM Studio is selected and the other provider is not silently substituted.
6. Given local discovery fails, when Wayfound determines AI state, then it does not send a request to a public/cloud AI endpoint.
