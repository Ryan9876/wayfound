import "server-only";

export type LocalAiConnectionState = "connected" | "ready" | "offline";
export type LocalAiProviderId = "lm-studio" | "ollama";

export type LocalAiStatus = {
  state: LocalAiConnectionState;
  provider: LocalAiProviderId | null;
  providerLabel: string | null;
  model: string | null;
  detail: string;
  detectedProviders: LocalAiProviderId[];
};

export type LocalAiTestResult = {
  ok: boolean;
  provider: LocalAiProviderId | null;
  providerLabel: string | null;
  model: string | null;
  response: string | null;
  responseTimeMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  detail: string;
};

type LmStudioModel = {
  type?: string;
  key?: string;
  display_name?: string;
  loaded_instances?: unknown[];
};

type OllamaModel = {
  name?: string;
  model?: string;
};

type ProviderProbe = {
  provider: LocalAiProviderId;
  providerLabel: string;
  reachable: boolean;
  activeModels: string[];
  availableModels: string[];
  authRequired?: boolean;
};

type LmStudioChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type OllamaChatResponse = {
  model?: string;
  message?: { content?: string | null };
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

const LM_STUDIO_URL = "http://127.0.0.1:1234";
const OLLAMA_URL = "http://127.0.0.1:11434";
const PROBE_TIMEOUT_MS = 650;
const TEST_TIMEOUT_MS = 120_000;
const TEST_MARKER = "WAYFOUND_LOCAL_AI_OK";

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown } | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { ok: response.ok, status: response.status, body };
  } catch {
    return null;
  }
}

function preferGlimmer(models: string[]): string | null {
  if (!models.length) return null;
  return models.find(model => model.toLowerCase().includes("glimmer")) ?? models[0];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeResponse(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function probeLmStudio(): Promise<ProviderProbe> {
  const result = await fetchJson(`${LM_STUDIO_URL}/api/v1/models`);
  if (!result) {
    return { provider: "lm-studio", providerLabel: "LM Studio", reachable: false, activeModels: [], availableModels: [] };
  }
  if (result.status === 401 || result.status === 403) {
    return { provider: "lm-studio", providerLabel: "LM Studio", reachable: true, activeModels: [], availableModels: [], authRequired: true };
  }
  if (!result.ok || !result.body || typeof result.body !== "object") {
    return { provider: "lm-studio", providerLabel: "LM Studio", reachable: false, activeModels: [], availableModels: [] };
  }

  const body = result.body as { models?: LmStudioModel[] };
  const llms = Array.isArray(body.models) ? body.models.filter(model => model.type === "llm") : [];
  // The model key is the provider identifier accepted by inference endpoints. Display names are fallback only.
  const availableModels = llms.map(model => model.key || model.display_name).filter((value): value is string => Boolean(value));
  const activeModels = llms
    .filter(model => Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0)
    .map(model => model.key || model.display_name)
    .filter((value): value is string => Boolean(value));

  return { provider: "lm-studio", providerLabel: "LM Studio", reachable: true, activeModels, availableModels };
}

async function probeOllama(): Promise<ProviderProbe> {
  const [runningResult, installedResult] = await Promise.all([
    fetchJson(`${OLLAMA_URL}/api/ps`),
    fetchJson(`${OLLAMA_URL}/api/tags`),
  ]);

  const reachable = Boolean(runningResult?.ok || installedResult?.ok);
  if (!reachable) {
    return { provider: "ollama", providerLabel: "Ollama", reachable: false, activeModels: [], availableModels: [] };
  }

  const runningBody = runningResult?.body as { models?: OllamaModel[] } | null;
  const installedBody = installedResult?.body as { models?: OllamaModel[] } | null;
  const activeModels = Array.isArray(runningBody?.models)
    ? runningBody.models.map(model => model.name || model.model).filter((value): value is string => Boolean(value))
    : [];
  const availableModels = Array.isArray(installedBody?.models)
    ? installedBody.models.map(model => model.name || model.model).filter((value): value is string => Boolean(value))
    : [];

  return { provider: "ollama", providerLabel: "Ollama", reachable: true, activeModels, availableModels };
}

export async function detectLocalAi(): Promise<LocalAiStatus> {
  const [lmStudio, ollama] = await Promise.all([probeLmStudio(), probeOllama()]);
  const detectedProviders = [lmStudio, ollama].filter(probe => probe.reachable).map(probe => probe.provider);

  const active = lmStudio.activeModels.length ? lmStudio : ollama.activeModels.length ? ollama : null;
  if (active) {
    const model = preferGlimmer(active.activeModels);
    return {
      state: "connected",
      provider: active.provider,
      providerLabel: active.providerLabel,
      model,
      detail: `${active.providerLabel} is connected to a running local model. Cloud fallback is disabled.`,
      detectedProviders,
    };
  }

  const ready = lmStudio.availableModels.length
    ? lmStudio
    : ollama.availableModels.length
      ? ollama
      : lmStudio.reachable
        ? lmStudio
        : ollama.reachable
          ? ollama
          : null;
  if (ready) {
    const model = preferGlimmer(ready.availableModels);
    const detail = ready.authRequired
      ? `${ready.providerLabel} is detected but requires authentication before Wayfound can use it.`
      : model
        ? `${ready.providerLabel} is detected. The AI test can ask the provider to load ${model}.`
        : `${ready.providerLabel} is detected. Load or install a local model to connect AI.`;
    return {
      state: "ready",
      provider: ready.provider,
      providerLabel: ready.providerLabel,
      model,
      detail,
      detectedProviders,
    };
  }

  return {
    state: "offline",
    provider: null,
    providerLabel: null,
    model: null,
    detail: "No supported local AI server was detected. Wayfound will not fall back to cloud AI.",
    detectedProviders,
  };
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }
  return { ok: response.ok, status: response.status, body: responseBody };
}

async function testLmStudio(model: string): Promise<LocalAiTestResult> {
  const started = performance.now();
  const result = await postJson(`${LM_STUDIO_URL}/v1/chat/completions`, {
    model,
    messages: [{ role: "user", content: `Respond with exactly ${TEST_MARKER} and nothing else.` }],
    temperature: 0,
    max_tokens: 32,
    stream: false,
  });
  const responseTimeMs = Math.round(performance.now() - started);
  if (!result.ok || !result.body || typeof result.body !== "object") {
    return {
      ok: false,
      provider: "lm-studio",
      providerLabel: "LM Studio",
      model,
      response: null,
      responseTimeMs,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      detail: `LM Studio returned HTTP ${result.status}.`,
    };
  }

  const body = result.body as LmStudioChatResponse;
  const response = normalizeResponse(body.choices?.[0]?.message?.content);
  const promptTokens = finiteNumber(body.usage?.prompt_tokens);
  const completionTokens = finiteNumber(body.usage?.completion_tokens);
  const reportedTotal = finiteNumber(body.usage?.total_tokens);
  const totalTokens = reportedTotal ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null);
  const ok = response.includes(TEST_MARKER);
  return {
    ok,
    provider: "lm-studio",
    providerLabel: "LM Studio",
    model: body.model || model,
    response: response || null,
    responseTimeMs,
    promptTokens,
    completionTokens,
    totalTokens,
    tokensPerSecond: null,
    detail: ok ? "Local inference returned the expected test marker." : "The model responded, but not with the expected test marker.",
  };
}

async function testOllama(model: string): Promise<LocalAiTestResult> {
  const started = performance.now();
  const result = await postJson(`${OLLAMA_URL}/api/chat`, {
    model,
    messages: [{ role: "user", content: `Respond with exactly ${TEST_MARKER} and nothing else.` }],
    stream: false,
    options: { temperature: 0, num_predict: 32 },
  });
  const responseTimeMs = Math.round(performance.now() - started);
  if (!result.ok || !result.body || typeof result.body !== "object") {
    return {
      ok: false,
      provider: "ollama",
      providerLabel: "Ollama",
      model,
      response: null,
      responseTimeMs,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      detail: `Ollama returned HTTP ${result.status}.`,
    };
  }

  const body = result.body as OllamaChatResponse;
  const response = normalizeResponse(body.message?.content);
  const promptTokens = finiteNumber(body.prompt_eval_count);
  const completionTokens = finiteNumber(body.eval_count);
  const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  const evalDurationNs = finiteNumber(body.eval_duration);
  const tokensPerSecond = completionTokens !== null && evalDurationNs && evalDurationNs > 0
    ? Math.round((completionTokens / (evalDurationNs / 1_000_000_000)) * 10) / 10
    : null;
  const ok = response.includes(TEST_MARKER);
  return {
    ok,
    provider: "ollama",
    providerLabel: "Ollama",
    model: body.model || model,
    response: response || null,
    responseTimeMs,
    promptTokens,
    completionTokens,
    totalTokens,
    tokensPerSecond,
    detail: ok ? "Local inference returned the expected test marker." : "The model responded, but not with the expected test marker.",
  };
}

export async function runLocalAiTest(): Promise<LocalAiTestResult> {
  const status = await detectLocalAi();
  if (!status.provider || !status.model) {
    return {
      ok: false,
      provider: status.provider,
      providerLabel: status.providerLabel,
      model: status.model,
      response: null,
      responseTimeMs: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      detail: status.detail,
    };
  }

  try {
    return status.provider === "lm-studio" ? await testLmStudio(status.model) : await testOllama(status.model);
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError"
      ? "The local AI test timed out before inference completed."
      : "The local AI test could not complete.";
    return {
      ok: false,
      provider: status.provider,
      providerLabel: status.providerLabel,
      model: status.model,
      response: null,
      responseTimeMs: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      detail,
    };
  }
}
