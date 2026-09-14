import "server-only";
import { detectLocalAi, type LocalAiProviderId } from "@/lib/ai/local-ai";

export type LocalAiHealthResult = {
  ok: boolean;
  provider: LocalAiProviderId | null;
  providerLabel: string | null;
  model: string | null;
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

type LmStudioNativeChatResponse = {
  model_instance_id?: string;
  output?: Array<{ type?: string; content?: string | null }>;
  stats?: {
    input_tokens?: number;
    total_output_tokens?: number;
    reasoning_output_tokens?: number;
    tokens_per_second?: number;
    time_to_first_token_seconds?: number;
  };
};

type OllamaChatResponse = {
  model?: string;
  message?: { content?: string | null };
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

const LM_STUDIO_URL = "http://127.0.0.1:1234";
const OLLAMA_URL = "http://127.0.0.1:11434";
const TEST_TIMEOUT_MS = 120_000;
const TEST_MARKER = "WAYFOUND_LOCAL_AI_OK";
const TEST_MAX_OUTPUT_TOKENS = 128;

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeResponse(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyMetrics() {
  return {
    promptTokens: null,
    completionTokens: null,
    reasoningTokens: null,
    totalTokens: null,
    tokensPerSecond: null,
    timeToFirstTokenMs: null,
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

function failureDetail(response: string, completionTokens: number | null, reasoningTokens: number | null) {
  if (!response && reasoningTokens !== null && reasoningTokens > 0) {
    return "The model produced reasoning output but no final health-check response.";
  }
  if (!response && completionTokens !== null && completionTokens >= TEST_MAX_OUTPUT_TOKENS) {
    return "The model reached the health-check output limit before returning a final response.";
  }
  return "The model responded, but did not return the expected health-check marker.";
}

async function testLmStudio(model: string): Promise<LocalAiHealthResult> {
  const started = performance.now();
  const result = await postJson(`${LM_STUDIO_URL}/api/v1/chat`, {
    model,
    input: `Reply with exactly ${TEST_MARKER} and nothing else.`,
    system_prompt: "This is a local connectivity health check. Follow the requested output exactly and do not explain.",
    temperature: 0,
    max_output_tokens: TEST_MAX_OUTPUT_TOKENS,
    ...(model.toLowerCase().includes("glimmer") ? { reasoning: "off" } : {}),
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
      ...emptyMetrics(),
      detail: `LM Studio returned HTTP ${result.status}.`,
    };
  }

  const body = result.body as LmStudioNativeChatResponse;
  const response = normalizeResponse(
    Array.isArray(body.output)
      ? body.output.find(item => item.type === "message")?.content
      : null,
  );
  const promptTokens = finiteNumber(body.stats?.input_tokens);
  const completionTokens = finiteNumber(body.stats?.total_output_tokens);
  const reasoningTokens = finiteNumber(body.stats?.reasoning_output_tokens);
  const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  const tokensPerSecond = finiteNumber(body.stats?.tokens_per_second);
  const timeToFirstTokenSeconds = finiteNumber(body.stats?.time_to_first_token_seconds);
  const timeToFirstTokenMs = timeToFirstTokenSeconds === null ? null : Math.round(timeToFirstTokenSeconds * 1000);
  const ok = response.includes(TEST_MARKER);

  return {
    ok,
    provider: "lm-studio",
    providerLabel: "LM Studio",
    model: body.model_instance_id || model,
    response: response || null,
    responseTimeMs,
    promptTokens,
    completionTokens,
    reasoningTokens,
    totalTokens,
    tokensPerSecond,
    timeToFirstTokenMs,
    detail: ok
      ? "Basic local inference completed and returned the expected health-check marker."
      : failureDetail(response, completionTokens, reasoningTokens),
  };
}

function isLocalOllamaModel(model: string) {
  return !model.toLowerCase().includes("cloud");
}

async function testOllama(model: string): Promise<LocalAiHealthResult> {
  if (!isLocalOllamaModel(model)) {
    return {
      ok: false,
      provider: "ollama",
      providerLabel: "Ollama",
      model,
      response: null,
      responseTimeMs: null,
      ...emptyMetrics(),
      detail: "Wayfound will not invoke an Ollama model identified as cloud-backed.",
    };
  }

  const started = performance.now();
  const result = await postJson(`${OLLAMA_URL}/api/chat`, {
    model,
    messages: [{ role: "user", content: `Reply with exactly ${TEST_MARKER} and nothing else.` }],
    stream: false,
    think: false,
    options: { temperature: 0, num_predict: TEST_MAX_OUTPUT_TOKENS },
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
      ...emptyMetrics(),
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
    reasoningTokens: null,
    totalTokens,
    tokensPerSecond,
    timeToFirstTokenMs: null,
    detail: ok
      ? "Basic local inference completed and returned the expected health-check marker."
      : failureDetail(response, completionTokens, null),
  };
}

export async function runLocalAiHealthTest(): Promise<LocalAiHealthResult> {
  const status = await detectLocalAi();
  if (!status.provider || !status.model) {
    return {
      ok: false,
      provider: status.provider,
      providerLabel: status.providerLabel,
      model: status.model,
      response: null,
      responseTimeMs: null,
      ...emptyMetrics(),
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
      ...emptyMetrics(),
      detail,
    };
  }
}
