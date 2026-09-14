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

const LM_STUDIO_URL = "http://127.0.0.1:1234";
const OLLAMA_URL = "http://127.0.0.1:11434";
const PROBE_TIMEOUT_MS = 650;

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
  const availableModels = llms.map(model => model.display_name || model.key).filter((value): value is string => Boolean(value));
  const activeModels = llms
    .filter(model => Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0)
    .map(model => model.display_name || model.key)
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

  const ready = lmStudio.reachable ? lmStudio : ollama.reachable ? ollama : null;
  if (ready) {
    const model = preferGlimmer(ready.availableModels);
    const detail = ready.authRequired
      ? `${ready.providerLabel} is detected but requires authentication before Wayfound can use it.`
      : model
        ? `${ready.providerLabel} is detected. Load or start ${model} to connect local AI.`
        : `${ready.providerLabel} is detected. Load or start a local model to connect AI.`;
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
