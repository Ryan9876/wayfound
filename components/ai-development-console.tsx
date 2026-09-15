"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = {
  id: "lm-studio" | "ollama" | "openai";
  label: string;
  kind: "local" | "cloud";
  state: "connected" | "ready" | "offline" | "not-configured";
  models: string[];
  activeModels: string[];
  detail: string;
};

type Catalog = { defaultProvider: "lm-studio"; providers: Provider[] };
type Selection = { provider: Provider["id"]; model: string | null };

type Metrics = {
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  timeToFirstTokenMs: number | null;
};

type TestResult = Metrics & {
  ok: boolean;
  provider: Provider["id"];
  providerLabel: string;
  model: string;
  response: string | null;
  responseTimeMs: number | null;
  detail: string;
};

type TraceEntry = {
  id: number;
  timestamp: string;
  operation: string;
  provider: string;
  providerLabel: string;
  model: string | null;
  method: string;
  endpoint: string;
  requestBody: string;
  responseStatus: number | null;
  responseBody: string;
  elapsedMs: number | null;
  error: string | null;
  metrics: Metrics;
};

function metric(value: number | null, suffix = "") {
  return value === null ? "Not reported" : `${value}${suffix}`;
}

function stateText(state: Provider["state"]) {
  if (state === "connected") return "Connected";
  if (state === "ready") return "Ready";
  if (state === "not-configured") return "Not configured";
  return "Offline";
}

function providerModelChoices(provider: Provider | null | undefined): string[] {
  if (!provider) return [];
  return [...new Set([...provider.activeModels, ...provider.models])];
}

export function AiDevelopmentConsole({ initialProvider, initialModel }: { initialProvider: string | null; initialModel: string | null }) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<string>(initialProvider ?? "lm-studio");
  const [model, setModel] = useState(initialModel ?? "");
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => providers.find(provider => provider.id === providerId) ?? null, [providers, providerId]);

  async function readSelection(): Promise<Selection | null> {
    try {
      const response = await fetch("/api/ai-dev/selection", { cache: "no-store" });
      const body = await response.json().catch(() => null) as { selection?: Selection } | null;
      return response.ok && body?.selection ? body.selection : null;
    } catch {
      return null;
    }
  }

  async function saveSelection(provider: Provider["id"], selectedModel: string) {
    try {
      const response = await fetch("/api/ai-dev/selection", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: selectedModel }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Wayfound could not save the development AI selection.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wayfound could not save the development AI selection.");
    }
  }

  async function loadProviders() {
    setLoadingProviders(true);
    setError(null);
    try {
      const [response, savedSelection] = await Promise.all([
        fetch("/api/ai-dev/providers", { cache: "no-store" }),
        readSelection(),
      ]);
      const body = await response.json().catch(() => null) as Catalog | { error?: string } | null;
      if (!response.ok || !body || !("providers" in body)) throw new Error(body && "error" in body && body.error ? body.error : "Provider discovery failed.");
      setProviders(body.providers);

      const savedProvider = savedSelection ? body.providers.find(provider => provider.id === savedSelection.provider) : null;
      const preferred = savedProvider
        ?? body.providers.find(provider => provider.id === body.defaultProvider)
        ?? body.providers[0];
      if (preferred) {
        setProviderId(preferred.id);
        const choices = providerModelChoices(preferred);
        const selectedModel = savedSelection?.provider === preferred.id && savedSelection.model && choices.includes(savedSelection.model)
          ? savedSelection.model
          : choices[0] ?? "";
        setModel(selectedModel);
        if (selectedModel && (!savedSelection || savedSelection.provider !== preferred.id || savedSelection.model !== selectedModel)) {
          await saveSelection(preferred.id, selectedModel);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Provider discovery failed.");
    } finally {
      setLoadingProviders(false);
    }
  }

  async function loadTrace() {
    try {
      const response = await fetch("/api/ai-dev/trace", { cache: "no-store" });
      const body = await response.json().catch(() => null) as { entries?: TraceEntry[] } | null;
      if (response.ok && Array.isArray(body?.entries)) setTraces(body.entries);
    } catch {
      // Keep the last visible trace if a refresh fails.
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadProviders();
    void loadTrace();
    const timer = window.setInterval(() => void loadTrace(), 1000);
    return () => window.clearInterval(timer);
    // Provider discovery should run only when the owner explicitly opens the console.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function chooseProvider(nextId: string) {
    setProviderId(nextId);
    setResult(null);
    setError(null);
    const next = providers.find(provider => provider.id === nextId);
    const choices = providerModelChoices(next);
    const nextModel = choices[0] ?? "";
    setModel(nextModel);
    if (next && nextModel) void saveSelection(next.id, nextModel);
  }

  function chooseModel(nextModel: string) {
    setModel(nextModel);
    setResult(null);
    setError(null);
    if (selected && nextModel) void saveSelection(selected.id, nextModel);
  }

  async function testConnection() {
    if (!selected || !model) return;
    setTesting(true);
    setError(null);
    setResult(null);
    try {
      await saveSelection(selected.id, model);
      const response = await fetch("/api/ai-dev/test", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selected.id, model }),
      });
      const body = await response.json().catch(() => null) as TestResult | { error?: string } | null;
      if (body && "provider" in body) setResult(body);
      else setError(body && "error" in body && body.error ? body.error : "The selected AI connection test failed to return a usable result.");
      await loadTrace();
    } catch {
      setError("Wayfound could not start the selected AI connection test.");
    } finally {
      setTesting(false);
    }
  }

  async function clearTrace() {
    try {
      const response = await fetch("/api/ai-dev/trace", { method: "DELETE", cache: "no-store" });
      if (response.ok) setTraces([]);
    } catch {
      setError("Wayfound could not clear the development trace.");
    }
  }

  const modelChoices = providerModelChoices(selected);

  return (
    <div className="ai-dev-console-control">
      <button className="ai-dev-console-button" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        AI Console <span>DEV</span>
      </button>
      {open ? (
        <section className="ai-dev-console-panel" role="dialog" aria-label="Development AI console">
          <div className="ai-dev-console-heading">
            <div><small>Development only</small><h2>AI traffic console</h2><p>Inspect provider/model state and the sanitized traffic Wayfound sends and receives. Trace data stays in process memory.</p></div>
            <button type="button" className="ai-dev-close" onClick={() => setOpen(false)}>Close</button>
          </div>

          <div className="ai-dev-selector-grid">
            <label>Provider<select value={providerId} onChange={event => chooseProvider(event.target.value)} disabled={loadingProviders || !providers.length}>
              {providers.map(provider => <option key={provider.id} value={provider.id}>{provider.label}{provider.kind === "cloud" ? " · public" : " · local"}</option>)}
            </select></label>
            <label>Model<select value={model} onChange={event => chooseModel(event.target.value)} disabled={!modelChoices.length}>
              {modelChoices.length ? modelChoices.map(name => <option key={name} value={name}>{name}</option>) : <option value="">No model available</option>}
            </select></label>
            <button className="ai-dev-secondary" type="button" onClick={loadProviders} disabled={loadingProviders}>{loadingProviders ? "Refreshing…" : "Refresh models"}</button>
            <button className="ai-dev-primary" type="button" onClick={testConnection} disabled={!selected || !model || testing || selected.state === "offline" || selected.state === "not-configured"}>{testing ? "Testing…" : "Test connection"}</button>
          </div>

          {selected ? <div className={`ai-dev-provider-state ai-dev-provider-${selected.state}`} role="status"><span aria-hidden="true" /><div><strong>{stateText(selected.state)} · {selected.label}</strong><p>{selected.detail}</p></div></div> : null}
          {selected?.kind === "cloud" ? <p className="ai-dev-cloud-warning"><strong>Public provider:</strong> a connection test sends the bounded test prompt to {selected.label}. Durable project AI review is still local-only; selecting OpenAI will not silently send a durable review to the cloud.</p> : <p className="ai-dev-local-note">The selected local model is also used by normal Wayfound AI reviews while this development console is enabled.</p>}
          {error ? <p className="ai-dev-error" role="alert">{error}</p> : null}

          {result ? <section className={`ai-dev-result ${result.ok ? "pass" : "fail"}`}><div><strong>{result.ok ? "Connection passed" : "Connection failed"}</strong><span>{result.providerLabel} · {result.model}</span></div><p>{result.detail}</p><dl>
            <div><dt>Response</dt><dd>{metric(result.responseTimeMs, " ms")}</dd></div>
            <div><dt>Input</dt><dd>{metric(result.promptTokens)}</dd></div>
            <div><dt>Output</dt><dd>{metric(result.completionTokens)}</dd></div>
            <div><dt>Total</dt><dd>{metric(result.totalTokens)}</dd></div>
            <div><dt>Reasoning</dt><dd>{metric(result.reasoningTokens)}</dd></div>
            <div><dt>Generation</dt><dd>{metric(result.tokensPerSecond, " tok/s")}</dd></div>
            <div><dt>First token</dt><dd>{metric(result.timeToFirstTokenMs, " ms")}</dd></div>
          </dl>{result.response ? <pre className="ai-dev-result-response">{result.response}</pre> : null}</section> : null}

          <div className="ai-dev-terminal-head"><div><strong>Traffic</strong><span>{traces.length} exchange{traces.length === 1 ? "" : "s"}</span></div><button type="button" className="ai-dev-secondary" onClick={clearTrace} disabled={!traces.length}>Clear traffic</button></div>
          <div className="ai-dev-terminal" aria-label="AI request and response traffic" aria-live="polite">
            {!traces.length ? <p className="ai-dev-terminal-empty">No AI traffic captured yet. Run a connection test or an instrumented Wayfound AI operation.</p> : traces.map(entry => (
              <article key={entry.id} className="ai-dev-exchange">
                <div className="ai-dev-line"><span>{new Date(entry.timestamp).toLocaleTimeString()}</span><strong>→ {entry.operation}</strong><span>{entry.providerLabel}{entry.model ? ` / ${entry.model}` : ""}</span></div>
                <div className="ai-dev-line"><span>{entry.method}</span><code>{entry.endpoint}</code></div>
                <div className="ai-dev-line ai-dev-response-line"><strong>← {entry.responseStatus === null ? "NO HTTP RESPONSE" : `HTTP ${entry.responseStatus}`}</strong><span>{metric(entry.elapsedMs, " ms")}</span><span>in {metric(entry.metrics.promptTokens)} · out {metric(entry.metrics.completionTokens)} · total {metric(entry.metrics.totalTokens)}</span></div>
                <details><summary>Request</summary><pre>{entry.requestBody}</pre></details>
                <details><summary>Response</summary><pre>{entry.responseBody}</pre></details>
                {entry.error ? <p className="ai-dev-terminal-error">{entry.error}</p> : null}
              </article>
            ))}
          </div>
          <p className="ai-dev-footnote">Secrets and authorization headers are excluded. This development trace and selection are transient and are not project evidence. LM Studio/Ollama selections control development AI reviews. OpenAI can be tested explicitly, but durable OpenAI review remains disabled until its provenance is separately migrated and validated.</p>
        </section>
      ) : null}
    </div>
  );
}
