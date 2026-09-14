import "server-only";
import { detectLocalAi, type LocalAiConnectionState, type LocalAiProviderId } from "@/lib/ai/local-ai";

export type LocalAiDiagnosticAttempt = {
  name: string;
  endpoint: string;
  httpStatus: number | null;
  elapsedMs: number | null;
  contentType: string | null;
  requestSummary: string;
  providerMessage: string | null;
  responsePreview: string | null;
  markerReturned: boolean | null;
};

export type LocalAiHealthDiagnostics = {
  testedAt: string;
  selectedState: LocalAiConnectionState;
  detectedProviders: LocalAiProviderId[];
  attempts: LocalAiDiagnosticAttempt[];
};

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
  diagnostics: LocalAiHealthDiagnostics;
};

type NativeBody = {
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

type CompatBody = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

type OllamaBody = {
  model?: string;
  message?: { content?: string | null };
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

type PostResult = {
  ok: boolean;
  status: number;
  body: unknown;
  rawBody: string;
  contentType: string | null;
  elapsedMs: number;
};

const LM_STUDIO_URL = "http://127.0.0.1:1234";
const OLLAMA_URL = "http://127.0.0.1:11434";
const TEST_TIMEOUT_MS = 120_000;
const TEST_MARKER = "WAYFOUND_LOCAL_AI_OK";
const TEST_MAX_OUTPUT_TOKENS = 128;
const DIAGNOSTIC_PREVIEW_LIMIT = 1800;

function n(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
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

function preview(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > DIAGNOSTIC_PREVIEW_LIMIT ? `${trimmed.slice(0, DIAGNOSTIC_PREVIEW_LIMIT)}…` : trimmed;
}

function providerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["message", "detail", "error"]) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      if (typeof nested.message === "string") return nested.message;
      if (typeof nested.detail === "string") return nested.detail;
      if (typeof nested.type === "string") return nested.type;
    }
  }
  return null;
}

async function postJson(url: string, body: unknown): Promise<PostResult> {
  const started = performance.now();
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawBody = await response.text().catch(() => "");
  let parsed: unknown = null;
  if (rawBody) {
    try { parsed = JSON.parse(rawBody); } catch { parsed = null; }
  }
  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
    rawBody,
    contentType: response.headers.get("content-type"),
    elapsedMs: Math.round(performance.now() - started),
  };
}

function attempt(
  name: string,
  endpoint: string,
  result: PostResult,
  requestSummary: string,
  markerReturned: boolean | null,
): LocalAiDiagnosticAttempt {
  return {
    name,
    endpoint,
    httpStatus: result.status,
    elapsedMs: result.elapsedMs,
    contentType: result.contentType,
    requestSummary,
    providerMessage: providerMessage(result.body),
    responsePreview: preview(result.rawBody),
    markerReturned,
  };
}

function diagnostics(
  status: Awaited<ReturnType<typeof detectLocalAi>>,
  attempts: LocalAiDiagnosticAttempt[],
): LocalAiHealthDiagnostics {
  return {
    testedAt: new Date().toISOString(),
    selectedState: status.state,
    detectedProviders: status.detectedProviders,
    attempts,
  };
}

function nativeValues(body: NativeBody) {
  const response = text(Array.isArray(body.output) ? body.output.find(item => item.type === "message")?.content : null);
  const promptTokens = n(body.stats?.input_tokens);
  const completionTokens = n(body.stats?.total_output_tokens);
  const reasoningTokens = n(body.stats?.reasoning_output_tokens);
  const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  const tokensPerSecond = n(body.stats?.tokens_per_second);
  const seconds = n(body.stats?.time_to_first_token_seconds);
  return {
    response,
    metrics: {
      promptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens,
      tokensPerSecond,
      timeToFirstTokenMs: seconds === null ? null : Math.round(seconds * 1000),
    },
  };
}

function compatValues(body: CompatBody) {
  const response = text(body.choices?.[0]?.message?.content);
  const promptTokens = n(body.usage?.prompt_tokens);
  const completionTokens = n(body.usage?.completion_tokens);
  const reportedTotal = n(body.usage?.total_tokens);
  const reasoningTokens = n(body.usage?.completion_tokens_details?.reasoning_tokens);
  return {
    response,
    metrics: {
      promptTokens,
      completionTokens,
      reasoningTokens,
      totalTokens: reportedTotal ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null),
      tokensPerSecond: null,
      timeToFirstTokenMs: null,
    },
  };
}

function noMarker(response: string, completionTokens: number | null, reasoningTokens: number | null) {
  if (!response && reasoningTokens !== null && reasoningTokens > 0) return "The model produced reasoning output but no final health-check response.";
  if (!response && completionTokens !== null && completionTokens >= TEST_MAX_OUTPUT_TOKENS) return "The model reached the health-check output limit before returning a final response.";
  return "The model responded, but did not return the expected health-check marker.";
}

async function testLmStudio(
  model: string,
  status: Awaited<ReturnType<typeof detectLocalAi>>,
): Promise<LocalAiHealthResult> {
  const attempts: LocalAiDiagnosticAttempt[] = [];
  const nativeEndpoint = `${LM_STUDIO_URL}/api/v1/chat`;
  const configured = await postJson(nativeEndpoint, {
    model,
    input: `Reply with exactly ${TEST_MARKER} and nothing else.`,
    system_prompt: "This is a local connectivity health check. Follow the requested output exactly and do not explain.",
    temperature: 0,
    max_output_tokens: TEST_MAX_OUTPUT_TOKENS,
    ...(model.toLowerCase().includes("glimmer") ? { reasoning: "off" } : {}),
  });

  if (configured.ok && configured.body && typeof configured.body === "object") {
    const body = configured.body as NativeBody;
    const parsed = nativeValues(body);
    const ok = parsed.response.includes(TEST_MARKER);
    attempts.push(attempt("LM Studio native configured", nativeEndpoint, configured, `model=${model}; reasoning=${model.toLowerCase().includes("glimmer") ? "off" : "default"}; max_output_tokens=${TEST_MAX_OUTPUT_TOKENS}; system_prompt=yes`, ok));
    if (ok) {
      return {
        ok: true,
        provider: "lm-studio",
        providerLabel: "LM Studio",
        model: body.model_instance_id || model,
        response: parsed.response || null,
        responseTimeMs: configured.elapsedMs,
        ...parsed.metrics,
        detail: "Basic local inference completed through LM Studio's native API.",
        diagnostics: diagnostics(status, attempts),
      };
    }
  } else {
    attempts.push(attempt("LM Studio native configured", nativeEndpoint, configured, `model=${model}; reasoning=${model.toLowerCase().includes("glimmer") ? "off" : "default"}; max_output_tokens=${TEST_MAX_OUTPUT_TOKENS}; system_prompt=yes`, null));
  }

  const minimal = await postJson(nativeEndpoint, {
    model,
    input: `Reply with exactly ${TEST_MARKER} and nothing else.`,
  });
  if (minimal.ok && minimal.body && typeof minimal.body === "object") {
    const body = minimal.body as NativeBody;
    const parsed = nativeValues(body);
    const ok = parsed.response.includes(TEST_MARKER);
    attempts.push(attempt("LM Studio native minimal", nativeEndpoint, minimal, `model=${model}; optional inference controls omitted`, ok));
    if (ok) {
      return {
        ok: true,
        provider: "lm-studio",
        providerLabel: "LM Studio",
        model: body.model_instance_id || model,
        response: parsed.response || null,
        responseTimeMs: minimal.elapsedMs,
        ...parsed.metrics,
        detail: "Local inference passed with a minimal LM Studio native request. The configured native request failed; diagnostics identify the incompatible option or payload.",
        diagnostics: diagnostics(status, attempts),
      };
    }
  } else {
    attempts.push(attempt("LM Studio native minimal", nativeEndpoint, minimal, `model=${model}; optional inference controls omitted`, null));
  }

  const compatibleEndpoint = `${LM_STUDIO_URL}/v1/chat/completions`;
  const compatible = await postJson(compatibleEndpoint, {
    model,
    messages: [{ role: "user", content: `Reply with exactly ${TEST_MARKER} and nothing else.` }],
    temperature: 0,
    max_tokens: TEST_MAX_OUTPUT_TOKENS,
    stream: false,
  });

  if (compatible.ok && compatible.body && typeof compatible.body === "object") {
    const body = compatible.body as CompatBody;
    const parsed = compatValues(body);
    const ok = parsed.response.includes(TEST_MARKER);
    attempts.push(attempt("LM Studio OpenAI compatibility", compatibleEndpoint, compatible, `model=${model}; temperature=0; max_tokens=${TEST_MAX_OUTPUT_TOKENS}; stream=false`, ok));
    return {
      ok,
      provider: "lm-studio",
      providerLabel: "LM Studio",
      model: body.model || model,
      response: parsed.response || null,
      responseTimeMs: compatible.elapsedMs,
      ...parsed.metrics,
      detail: ok
        ? "Local inference passed through LM Studio's OpenAI-compatible endpoint. The native API attempts failed; see diagnostics for the provider error payloads."
        : noMarker(parsed.response, parsed.metrics.completionTokens, parsed.metrics.reasoningTokens),
      diagnostics: diagnostics(status, attempts),
    };
  }

  attempts.push(attempt("LM Studio OpenAI compatibility", compatibleEndpoint, compatible, `model=${model}; temperature=0; max_tokens=${TEST_MAX_OUTPUT_TOKENS}; stream=false`, null));
  const message = attempts.map(item => item.providerMessage).find(Boolean);
  return {
    ok: false,
    provider: "lm-studio",
    providerLabel: "LM Studio",
    model,
    response: null,
    responseTimeMs: compatible.elapsedMs,
    ...emptyMetrics(),
    detail: message ? `LM Studio rejected the health test: ${message}` : `LM Studio health-test attempts failed. The last HTTP status was ${compatible.status}.`,
    diagnostics: diagnostics(status, attempts),
  };
}

function isLocalOllamaModel(model: string) {
  return !model.toLowerCase().includes("cloud");
}

async function testOllama(
  model: string,
  status: Awaited<ReturnType<typeof detectLocalAi>>,
): Promise<LocalAiHealthResult> {
  const endpoint = `${OLLAMA_URL}/api/chat`;
  const attempts: LocalAiDiagnosticAttempt[] = [];
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
      diagnostics: diagnostics(status, attempts),
    };
  }

  const result = await postJson(endpoint, {
    model,
    messages: [{ role: "user", content: `Reply with exactly ${TEST_MARKER} and nothing else.` }],
    stream: false,
    think: false,
    options: { temperature: 0, num_predict: TEST_MAX_OUTPUT_TOKENS },
  });

  if (!result.ok || !result.body || typeof result.body !== "object") {
    attempts.push(attempt("Ollama local chat", endpoint, result, `model=${model}; think=false; num_predict=${TEST_MAX_OUTPUT_TOKENS}; stream=false`, null));
    const message = providerMessage(result.body);
    return {
      ok: false,
      provider: "ollama",
      providerLabel: "Ollama",
      model,
      response: null,
      responseTimeMs: result.elapsedMs,
      ...emptyMetrics(),
      detail: message ? `Ollama rejected the health test: ${message}` : `Ollama returned HTTP ${result.status}.`,
      diagnostics: diagnostics(status, attempts),
    };
  }

  const body = result.body as OllamaBody;
  const response = text(body.message?.content);
  const promptTokens = n(body.prompt_eval_count);
  const completionTokens = n(body.eval_count);
  const totalTokens = promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null;
  const evalDurationNs = n(body.eval_duration);
  const tokensPerSecond = completionTokens !== null && evalDurationNs && evalDurationNs > 0
    ? Math.round((completionTokens / (evalDurationNs / 1_000_000_000)) * 10) / 10
    : null;
  const ok = response.includes(TEST_MARKER);
  attempts.push(attempt("Ollama local chat", endpoint, result, `model=${model}; think=false; num_predict=${TEST_MAX_OUTPUT_TOKENS}; stream=false`, ok));
  return {
    ok,
    provider: "ollama",
    providerLabel: "Ollama",
    model: body.model || model,
    response: response || null,
    responseTimeMs: result.elapsedMs,
    promptTokens,
    completionTokens,
    reasoningTokens: null,
    totalTokens,
    tokensPerSecond,
    timeToFirstTokenMs: null,
    detail: ok ? "Basic local inference completed through Ollama." : noMarker(response, completionTokens, null),
    diagnostics: diagnostics(status, attempts),
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
      diagnostics: diagnostics(status, []),
    };
  }

  try {
    return status.provider === "lm-studio" ? await testLmStudio(status.model, status) : await testOllama(status.model, status);
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError"
      ? "The local AI test timed out before inference completed."
      : error instanceof Error
        ? `The local AI test could not complete: ${error.message}`
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
      diagnostics: diagnostics(status, []),
    };
  }
}
