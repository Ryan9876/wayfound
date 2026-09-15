import "server-only";

import { recordAiDevTrace, type AiDevTraceMetrics } from "@/lib/ai/dev-trace";

export type AiDevelopmentProviderId = "lm-studio" | "ollama" | "openai";
export type AiDevelopmentProviderState = "connected" | "ready" | "offline" | "not-configured";

export type AiDevelopmentProvider = {
  id: AiDevelopmentProviderId;
  label: string;
  kind: "local" | "cloud";
  state: AiDevelopmentProviderState;
  models: string[];
  activeModels: string[];
  detail: string;
};

export type AiDevelopmentCatalog = {
  defaultProvider: "lm-studio";
  providers: AiDevelopmentProvider[];
};

export type AiDevelopmentTestResult = {
  ok: boolean;
  provider: AiDevelopmentProviderId;
  providerLabel: string;
  model: string;
  response: string | null;
  responseTimeMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  timeToFirstTokenMs: number | null;
  detail: string;
};

type JsonResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

type PostResult = JsonResult & {
  elapsedMs: number;
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

const PROBE_TIMEOUT_MS = 3_000;
const TEST_TIMEOUT_MS = 120_000;
const TEST_MARKER = "WAYFOUND_AI_DEV_OK";
const TEST_MAX_OUTPUT_TOKENS = 96;
const OPENAI_URL = "https://api.openai.com/v1";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function approvedLocalBaseUrl(name: "LM_STUDIO_BASE_URL" | "OLLAMA_BASE_URL", fallback: string, expectedPort: string): string | null {
  const value = process.env[name]?.trim() || fallback;
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "host.docker.internal";
    if (url.protocol !== "http:" || !allowedHost || url.port !== expectedPort || (url.pathname !== "/" && url.pathname !== "")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function lmStudioDevelopmentUrl(): string | null {
  return approvedLocalBaseUrl("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234", "1234");
}

export function ollamaDevelopmentUrl(): string | null {
  return approvedLocalBaseUrl("OLLAMA_BASE_URL", "http://127.0.0.1:11434", "11434");
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<JsonResult | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { Accept: "application/json", ...headers },
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch {
    return null;
  }
}

function localConfigurationError(label: string): AiDevelopmentProvider {
  return {
    id: label === "LM Studio" ? "lm-studio" : "ollama",
    label,
    kind: "local",
    state: "offline",
    models: [],
    activeModels: [],
    detail: `${label} base URL is outside the approved local development boundary.`,
  };
}

async function probeLmStudio(): Promise<AiDevelopmentProvider> {
  const base = lmStudioDevelopmentUrl();
  if (!base) return localConfigurationError("LM Studio");
  const result = await fetchJson(`${base}/api/v1/models`);
  if (!result) {
    return { id: "lm-studio", label: "LM Studio", kind: "local", state: "offline", models: [], activeModels: [], detail: "LM Studio did not respond." };
  }
  if (!result.ok || !result.body || typeof result.body !== "object") {
    const auth = result.status === 401 || result.status === 403;
    return { id: "lm-studio", label: "LM Studio", kind: "local", state: auth ? "ready" : "offline", models: [], activeModels: [], detail: auth ? "LM Studio is reachable but requires authentication." : `LM Studio returned HTTP ${result.status}.` };
  }
  const body = result.body as { models?: LmStudioModel[] };
  const llms = Array.isArray(body.models) ? body.models.filter(model => model.type === "llm") : [];
  const models = unique(llms.map(model => model.key || model.display_name || ""));
  const activeModels = unique(llms.filter(model => Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0).map(model => model.key || model.display_name || ""));
  return {
    id: "lm-studio",
    label: "LM Studio",
    kind: "local",
    state: activeModels.length ? "connected" : models.length ? "ready" : "ready",
    models,
    activeModels,
    detail: activeModels.length ? "LM Studio is connected to a loaded model." : models.length ? "LM Studio is reachable and models are available to load." : "LM Studio is reachable but no LLM models were reported.",
  };
}

function isLocalOllamaModel(model: string): boolean {
  return !model.toLowerCase().includes("cloud");
}

async function probeOllama(): Promise<AiDevelopmentProvider> {
  const base = ollamaDevelopmentUrl();
  if (!base) return localConfigurationError("Ollama");
  const [running, installed] = await Promise.all([
    fetchJson(`${base}/api/ps`),
    fetchJson(`${base}/api/tags`),
  ]);
  const reachable = Boolean(running?.ok || installed?.ok);
  if (!reachable) {
    return { id: "ollama", label: "Ollama", kind: "local", state: "offline", models: [], activeModels: [], detail: "Ollama did not respond." };
  }
  const runningBody = running?.body as { models?: OllamaModel[] } | null;
  const installedBody = installed?.body as { models?: OllamaModel[] } | null;
  const activeModels = unique(Array.isArray(runningBody?.models) ? runningBody.models.map(model => model.name || model.model || "").filter(isLocalOllamaModel) : []);
  const models = unique(Array.isArray(installedBody?.models) ? installedBody.models.map(model => model.name || model.model || "").filter(isLocalOllamaModel) : []);
  return {
    id: "ollama",
    label: "Ollama",
    kind: "local",
    state: activeModels.length ? "connected" : "ready",
    models,
    activeModels,
    detail: activeModels.length ? "Ollama is connected to a running model." : models.length ? "Ollama is reachable and installed models are available." : "Ollama is reachable but no local models were reported.",
  };
}

function likelyTextModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (["embedding", "image", "audio", "tts", "transcribe", "realtime", "moderation", "whisper", "sora"].some(part => lower.includes(part))) return false;
  return lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4") || lower.startsWith("o5") || lower.includes("codex");
}

async function probeOpenAi(): Promise<AiDevelopmentProvider> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { id: "openai", label: "OpenAI", kind: "cloud", state: "not-configured", models: [], activeModels: [], detail: "OpenAI is not configured. Set OPENAI_API_KEY in the local Wayfound environment to enable explicit cloud testing." };
  }
  const result = await fetchJson(`${OPENAI_URL}/models`, { Authorization: `Bearer ${key}` });
  if (!result) {
    return { id: "openai", label: "OpenAI", kind: "cloud", state: "offline", models: [], activeModels: [], detail: "OpenAI model discovery did not respond." };
  }
  if (!result.ok || !result.body || typeof result.body !== "object") {
    return { id: "openai", label: "OpenAI", kind: "cloud", state: "offline", models: [], activeModels: [], detail: `OpenAI model discovery returned HTTP ${result.status}.` };
  }
  const body = result.body as { data?: Array<{ id?: string }> };
  const models = unique(Array.isArray(body.data) ? body.data.map(model => model.id || "").filter(likelyTextModel).sort() : []);
  return {
    id: "openai",
    label: "OpenAI",
    kind: "cloud",
    state: "connected",
    models,
    activeModels: models,
    detail: models.length ? "OpenAI is configured and model discovery succeeded." : "OpenAI is configured, but no supported text model identifiers were returned.",
  };
}

export async function discoverDevelopmentAiProviders(): Promise<AiDevelopmentCatalog> {
  const [lmStudio, ollama, openai] = await Promise.all([probeLmStudio(), probeOllama(), probeOpenAi()]);
  return { defaultProvider: "lm-studio", providers: [lmStudio, ollama, openai] };
}

function n(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function emptyMetrics(): AiDevTraceMetrics {
  return { promptTokens: null, completionTokens: null, reasoningTokens: null, totalTokens: null, tokensPerSecond: null, timeToFirstTokenMs: null };
}

async function postJson(
  provider: AiDevelopmentProvider,
  model: string,
  endpoint: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<PostResult> {
  const started = performance.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
      headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const raw = await response.text().catch(() => "");
    let parsed: unknown = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
    const elapsedMs = Math.round(performance.now() - started);
    recordAiDevTrace({
      operation: "connection-test",
      provider: provider.id,
      providerLabel: provider.label,
      model,
      method: "POST",
      endpoint,
      requestBody: body,
      responseStatus: response.status,
      responseBody: parsed,
      elapsedMs,
      error: null,
    });
    return { ok: response.ok, status: response.status, body: parsed, elapsedMs };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    const message = error instanceof Error ? error.message : "Request failed";
    recordAiDevTrace({
      operation: "connection-test",
      provider: provider.id,
      providerLabel: provider.label,
      model,
      method: "POST",
      endpoint,
      requestBody: body,
      responseStatus: null,
      responseBody: { error: message },
      elapsedMs,
      error: message,
    });
    throw error;
  }
}

function result(
  provider: AiDevelopmentProvider,
  model: string,
  response: string | null,
  responseTimeMs: number | null,
  metrics: AiDevTraceMetrics,
  ok: boolean,
  detail: string,
): AiDevelopmentTestResult {
  return {
    ok,
    provider: provider.id,
    providerLabel: provider.label,
    model,
    response,
    responseTimeMs,
    ...metrics,
    detail,
  };
}

async function testLmStudio(provider: AiDevelopmentProvider, model: string): Promise<AiDevelopmentTestResult> {
  const base = lmStudioDevelopmentUrl();
  if (!base) return result(provider, model, null, null, emptyMetrics(), false, "LM Studio has an invalid development base URL.");
  const endpoint = `${base}/v1/chat/completions`;
  const body = {
    model,
    messages: [{ role: "user", content: `Reply with exactly ${TEST_MARKER} and nothing else.` }],
    temperature: 0,
    max_tokens: TEST_MAX_OUTPUT_TOKENS,
    stream: false,
  };
  const call = await postJson(provider, model, endpoint, body);
  const responseBody = call.body && typeof call.body === "object" ? call.body as Record<string, unknown> : {};
  const choices = Array.isArray(responseBody.choices) ? responseBody.choices as Array<Record<string, unknown>> : [];
  const message = choices[0]?.message && typeof choices[0].message === "object" ? choices[0].message as Record<string, unknown> : {};
  const text = typeof message.content === "string" ? message.content.trim() : "";
  const usage = responseBody.usage && typeof responseBody.usage === "object" ? responseBody.usage as Record<string, unknown> : {};
  const promptTokens = n(usage.prompt_tokens);
  const completionTokens = n(usage.completion_tokens);
  const totalTokens = n(usage.total_tokens) ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null);
  const details = usage.completion_tokens_details && typeof usage.completion_tokens_details === "object" ? usage.completion_tokens_details as Record<string, unknown> : {};
  const metrics = { ...emptyMetrics(), promptTokens, completionTokens, reasoningTokens: n(details.reasoning_tokens), totalTokens };
  const ok = call.ok && text.includes(TEST_MARKER);
  return result(provider, model, text || null, call.elapsedMs, metrics, ok, ok ? "LM Studio returned the expected development marker." : `LM Studio did not complete the selected-model test successfully (HTTP ${call.status}).`);
}

async function testOllama(provider: AiDevelopmentProvider, model: string): Promise<AiDevelopmentTestResult> {
  const base = ollamaDevelopmentUrl();
  if (!base) return result(provider, model, null, null, emptyMetrics(), false, "Ollama has an invalid development base URL.");
  const endpoint = `${base}/api/chat`;
  const body = {
    model,
    messages: [{ role: "user", content: `Reply with exactly ${TEST_MARKER} and nothing else.` }],
    stream: false,
    think: false,
    options: { temperature: 0, num_predict: TEST_MAX_OUTPUT_TOKENS },
  };
  const call = await postJson(provider, model, endpoint, body);
  const responseBody = call.body && typeof call.body === "object" ? call.body as Record<string, unknown> : {};
  const message = responseBody.message && typeof responseBody.message === "object" ? responseBody.message as Record<string, unknown> : {};
  const text = typeof message.content === "string" ? message.content.trim() : "";
  const promptTokens = n(responseBody.prompt_eval_count);
  const completionTokens = n(responseBody.eval_count);
  const evalDuration = n(responseBody.eval_duration);
  const metrics = {
    ...emptyMetrics(),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null,
    tokensPerSecond: completionTokens !== null && evalDuration !== null && evalDuration > 0 ? Math.round((completionTokens / (evalDuration / 1_000_000_000)) * 10) / 10 : null,
  };
  const ok = call.ok && text.includes(TEST_MARKER);
  return result(provider, model, text || null, call.elapsedMs, metrics, ok, ok ? "Ollama returned the expected development marker." : `Ollama did not complete the selected-model test successfully (HTTP ${call.status}).`);
}

function openAiOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") return body.output_text.trim();
  if (!Array.isArray(body.output)) return "";
  for (const item of body.output as Array<Record<string, unknown>>) {
    if (!Array.isArray(item.content)) continue;
    for (const content of item.content as Array<Record<string, unknown>>) {
      if (typeof content.text === "string" && (content.type === "output_text" || !content.type)) return content.text.trim();
    }
  }
  return "";
}

async function testOpenAi(provider: AiDevelopmentProvider, model: string): Promise<AiDevelopmentTestResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return result(provider, model, null, null, emptyMetrics(), false, "OpenAI is not configured.");
  const endpoint = `${OPENAI_URL}/responses`;
  const body = {
    model,
    instructions: "This is a Wayfound development connectivity test. Follow the requested output exactly and do not explain.",
    input: `Reply with exactly ${TEST_MARKER} and nothing else.`,
    max_output_tokens: TEST_MAX_OUTPUT_TOKENS,
  };
  const call = await postJson(provider, model, endpoint, body, { Authorization: `Bearer ${key}` });
  const responseBody = call.body && typeof call.body === "object" ? call.body as Record<string, unknown> : {};
  const text = openAiOutputText(responseBody);
  const usage = responseBody.usage && typeof responseBody.usage === "object" ? responseBody.usage as Record<string, unknown> : {};
  const promptTokens = n(usage.input_tokens);
  const completionTokens = n(usage.output_tokens);
  const details = usage.output_tokens_details && typeof usage.output_tokens_details === "object" ? usage.output_tokens_details as Record<string, unknown> : {};
  const metrics = {
    ...emptyMetrics(),
    promptTokens,
    completionTokens,
    reasoningTokens: n(details.reasoning_tokens),
    totalTokens: n(usage.total_tokens) ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null),
  };
  const ok = call.ok && text.includes(TEST_MARKER);
  return result(provider, model, text || null, call.elapsedMs, metrics, ok, ok ? "OpenAI returned the expected development marker." : `OpenAI did not complete the selected-model test successfully (HTTP ${call.status}).`);
}

export async function testDevelopmentAiSelection(providerId: string, model: string): Promise<AiDevelopmentTestResult> {
  const normalizedModel = model.trim();
  if (!(["lm-studio", "ollama", "openai"] as string[]).includes(providerId) || !normalizedModel || normalizedModel.length > 500) {
    throw new Error("INVALID_SELECTION");
  }
  const catalog = await discoverDevelopmentAiProviders();
  const provider = catalog.providers.find(item => item.id === providerId);
  if (!provider || provider.state === "offline" || provider.state === "not-configured" || !provider.models.includes(normalizedModel)) {
    throw new Error("UNAVAILABLE_SELECTION");
  }
  try {
    if (provider.id === "lm-studio") return await testLmStudio(provider, normalizedModel);
    if (provider.id === "ollama") return await testOllama(provider, normalizedModel);
    return await testOpenAi(provider, normalizedModel);
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError"
      ? `${provider.label} timed out before the development test completed.`
      : `${provider.label} could not complete the development test.`;
    return result(provider, normalizedModel, null, null, emptyMetrics(), false, detail);
  }
}
