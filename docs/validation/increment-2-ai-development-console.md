# Increment 2 AI development console validation

**Status:** Validated application/test slice

**Validated application/test head:** `8ff850afb99eb6a9e73635b700ae2543086826eb`

**CI run:** 399 (`34922539323`)

**Requirement basis:** `WF-OWN-001`, `WF-AI-002`, `WF-AI-003`, `WF-REC-002`, `WF-UI-003`; ADR-0005 and ADR-0007

**Slice:** [INCREMENT_2_AI_DEVELOPMENT_CONSOLE.md](../INCREMENT_2_AI_DEVELOPMENT_CONSOLE.md)

## Validated outcome

The approved local single-user development/test experience now exposes a temporary AI development console that makes supported AI connectivity observable without changing AI authority. LM Studio remains the default development provider; LM Studio and Ollama models are discovered and selectable, and an explicit selected local model controls normal Wayfound local AI-review inference while the console is enabled.

The console shows text connection state plus a bounded in-memory request/response trace with provider, model, endpoint, HTTP result, elapsed time, and available token/performance metrics. Trace data is transient development instrumentation, is not written to project records, and excludes configured credentials and authorization values.

An explicitly configured OpenAI connection can be discovered and tested from the development surface using a server-side `OPENAI_API_KEY`. This does not widen durable project AI-review provenance. When OpenAI is selected, a durable project review fails visibly before cloud inference and does not silently fall back to an available local provider.

This slice validates development-time provider selection and observability only. Durable cloud AI review remains outside this slice until a separate approved schema/provenance migration and validation expands that boundary.

## CI evidence

CI run 399 completed successfully on exact application/test head `8ff850afb99eb6a9e73635b700ae2543086826eb`.

Both `validate` and `durable-workspace` jobs passed. The run included:

- prototype, accessibility, single-user-mode, local-AI, AI-development-console, and workspace-guidance contract checks;
- TypeScript and optimized production builds;
- keyboard navigation and responsive screenshot capture;
- isolated local Supabase startup and the complete existing migration set;
- database security checks;
- focused browser validation for the development AI console;
- configured OpenAI runtime validation through a test-only loopback transport shim while preserving the fixed `https://api.openai.com/v1` product endpoint semantics;
- the complete prior durable workspace, criterion, evidence, artifact, artifact-acceptance, specialist-review, work-lifecycle/completion, durable AI-review, dependency, project-direction-link, technical-decision, and technical-requirement regression chain; and
- automatic single-user owner-session/UI validation.

The focused local-provider browser suite reported:

> PASS: development AI console browser flow detects and selects LM Studio/Ollama models, shows explicit provider connection state, keeps OpenAI unconfigured without a key, exercises real request/response traffic with token/performance metrics, persists the selected local model in process memory, applies that selection to normal Wayfound AI review traffic, renders without desktop/mobile overflow, and clears transient trace data.

The configured OpenAI suite also passed in run 399. It exercised model discovery and explicit connection testing with a fake server-side key against a loopback stub, verified the selected supported model and reported token metrics, confirmed the key was absent from browser and trace data, and proved that an OpenAI-selected durable project review failed before any OpenAI inference request and without local-provider fallback.

Run 398 exposed a test-design gap rather than a product regression: the configured-OpenAI test did not provide a local provider, so the existing local-only durable-review form was correctly unavailable before the test could exercise the intended server-side boundary. The test was strengthened on unchanged product behavior by supplying a local provider stub, explicitly retaining OpenAI as the development-console selection, and asserting that durable review reached neither OpenAI nor the available local provider. Run 399 passed that stronger check.

## Focused behavior exercised

The executed validation confirms:

- the development console is gated by explicit local single-user/test configuration;
- a text AI connection indicator is visible and does not rely on color alone;
- LM Studio is the default development provider;
- all supported discovered LM Studio LLM models remain selectable;
- Ollama remains independently selectable and all reported eligible local models are listed;
- an explicit LM Studio or Ollama selection controls subsequent normal Wayfound local AI-review inference while the console is enabled;
- a missing OpenAI key is represented as `Not configured` and sends no OpenAI request;
- a configured OpenAI connection discovers supported model identifiers and can run an explicit connection test;
- the selected provider/model is used by connection tests rather than silently switching providers;
- request and bounded response traffic is shown with provider/model, endpoint/result, timing, and available token/performance data;
- unavailable metrics are not invented;
- authorization/API-key values are absent from returned trace data and rendered browser content;
- trace data can be cleared without changing project records;
- the development trace is process-memory instrumentation rather than project evidence;
- local-provider failure does not trigger automatic OpenAI use;
- selecting OpenAI does not authorize durable cloud project review;
- an OpenAI-selected durable review fails visibly before cloud inference;
- that blocked durable review does not silently fall back to the available LM Studio provider; and
- the existing durable local-AI review behavior and prior regression chain remain intact.

## Rendered evidence

The `workspace-screenshots` artifact from run 399 is:

- **Artifact ID:** `10379046879`
- **Size:** `35,419,011` bytes
- **GitHub SHA-256:** `f6e2f87d3c6eafde906a824a21a49a97e8c278339275a56dddbe15aca3f33d82`
- **Files inspected directly:** `ai-development-console-desktop.png` and `ai-development-console-mobile.png`

Direct visual inspection confirmed:

- the console is clearly labeled `DEVELOPMENT ONLY` and `AI traffic console`;
- provider and model selectors, **Refresh models**, **Test connection**, and **Clear traffic** controls are visible;
- the selected Ollama model shows a text `Connected · Ollama` state in the captured evidence;
- the trace visibly identifies the durable-work-review operation, provider/model, endpoint, HTTP result, elapsed time, and token counts;
- the outbound request and inbound response are readable in a terminal-style bounded surface;
- explanatory copy states that secrets/authorization headers are excluded and that trace data is transient, not project evidence;
- the underlying durable AI-review card still states that AI analysis is advisory and not verification;
- the desktop overlay remains readable within the existing Wayfound visual language; and
- the 390 px mobile layout remains within the viewport, with the terminal trace using its own bounded scrolling area rather than causing page-level horizontal overflow.

## Security and authority boundary verified

OpenAI credentials remain server-side. The executed configured-provider test supplied a fake key to the application process, verified that the server-side request carried the expected authorization, and separately asserted that the key did not appear in browser HTML or the returned development trace.

The public-provider transport used in CI is test-only. The application still records and reasons about the fixed public OpenAI endpoint; the Node test process redirects that traffic to a loopback stub only so the configured-cloud behavior can be executed without contacting a live public service or using a real secret.

Provider health or connection success does not establish project verification, validation, release readiness, or authorization. The durable AI-review schema remains restricted to the previously validated local provider provenance. No automatic cloud fallback is permitted.

## Removal and remaining scope

The terminal-style console is intentionally temporary development instrumentation. Once provider integration is stable enough that raw traffic is no longer useful for routine debugging, the console may be removed or disabled without removing separately approved connection-state or provider-selection behavior.

A later slice is required before OpenAI or another public provider may become durable project-review provenance. That work must explicitly address schema migration, privacy/provenance semantics, authority boundaries, failure behavior, and regression validation.

## Validation conclusion

The bounded AI development-console slice is **Validated** at application/test head `8ff850afb99eb6a9e73635b700ae2543086826eb` through CI run 399 and direct rendered-evidence inspection. Increment 2 as a whole remains **In progress**.

Project-record reconciliation must still pass CI on the exact reconciliation head before the repository-wide status update is final. No Released or production-readiness state is claimed.
