import "server-only";

import { detectLocalAi, type LocalAiProviderId } from "@/lib/ai/local-ai";
import { recordAiDevTrace } from "@/lib/ai/dev-trace";
import type { AiWorkSnapshot } from "@/lib/domain/ai-review";

export type LocalAiReviewResult = {
  ok: boolean;
  provider: LocalAiProviderId | null;
  providerLabel: string | null;
  model: string | null;
  output: string | null;
  responseTimeMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  detail: string;
};

type NativeBody = {
  model_instance_id?: string;
  output?: Array<{ type?: string; content?: string | null }>;
  stats?: {
    input_tokens?: number;
    total_output_tokens?: number;
    reasoning_output_tokens?: number;
    tokens_per_second?: number;
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

const LM_STUDIO_URL = "http://127.0.0.1:1234";
const OLLAMA_URL = "http://127.0.0.1:11434";
const REVIEW_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_TOKENS = 1500;
const MAX_RESULT_CHARS = 12000;

function n(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bounded(value: string): string {
  return value.length > MAX_RESULT_CHARS ? `${value.slice(0, MAX_RESULT_CHARS - 1)}…` : value;
}

function systemInstruction() {
  return [
    "You are performing an advisory Wayfound review of one stored work-item record.",
    "Review only the supplied record. Do not claim that you inspected source code, files, external URLs, systems, tests, or evidence unless that material appears in the supplied record.",
    "Distinguish observations from assumptions. Identify material gaps, risks, unclear completion claims, and the next useful action when appropriate.",
    "Do not label the work Verified, Validated, Released, safe, secure, correct, or production-ready.",
    "Keep the response concise and use these headings: Assessment, Gaps or risks, Suggested next action.",
  ].join(" ");
}

function reviewPrompt(purpose: string, snapshot: AiWorkSnapshot) {
  return [
    `Review purpose: ${purpose}`,
    "Context boundary: work-item record only.",
    `Work item ID: ${snapshot.work_item_id}`,
    `Revision: ${snapshot.revision}`,
    `Stage: ${snapshot.stage_number}`,
    `Status: ${snapshot.status}`,
    `Title: ${snapshot.title}`,
    `Intended outcome: ${snapshot.outcome}`,
    `Completion condition: ${snapshot.completion_condition}`,
    `Expected evidence: ${snapshot.evidence_expectation}`,
    `Implementation note: ${snapshot.implementation_note ?? "Not recorded"}`,
  ].join("\n");
}

function traceContext(url: string, body: unknown) {
  const provider: LocalAiProviderId = url.includes(":11434") ? "ollama" : "lm-studio";
  const providerLabel = provider === "ollama" ? "Ollama" : "LM Studio";
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const model = typeof record.model === "string" ? record.model : null;
  return { provider, providerLabel, model };
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; body: unknown; elapsedMs: number }> {
  const started = performance.now();
  const trace = traceContext(url, body);
  try {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(REVIEW_TIMEOUT_MS),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    const elapsedMs = Math.round(performance.now() - started);
    recordAiDevTrace({
      operation: "durable-work-review",
      provider: trace.provider,
      providerLabel: trace.providerLabel,
      model: trace.model,
      method: "POST",
      endpoint: url,
      requestBody: body,
      responseStatus: response.status,
      responseBody: parsed,
      elapsedMs,
      error: null,
    });
    return { ok: response.ok, status: response.status, body: parsed, elapsedMs };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    const message = error instanceof Error ? error.message : "Local AI request failed";
    recordAiDevTrace({
      operation: "durable-work-review",
      provider: trace.provider,
      providerLabel: trace.providerLabel,
      model: trace.model,
      method: "POST",
      endpoint: url,
      requestBody: body,
      responseStatus: null,
      responseBody: { error: message },
      elapsedMs,
      error: message,
    });
    throw error;
  }
}

function emptyFailure(
  provider: LocalAiProviderId | null,
  providerLabel: string | null,
  model: string | null,
  detail: string,
  responseTimeMs: number | null = null,
): LocalAiReviewResult {
  return {
    ok: false,
    provider,
    providerLabel,
    model,
    output: null,
    responseTimeMs,
    promptTokens: null,
    completionTokens: null,
    reasoningTokens: null,
    totalTokens: null,
    tokensPerSecond: null,
    detail,
  };
}

async function reviewWithLmStudio(model: string, purpose: string, snapshot: AiWorkSnapshot): Promise<LocalAiReviewResult> {
  const prompt = reviewPrompt(purpose, snapshot);
  const native = await postJson(`${LM_STUDIO_URL}/api/v1/chat`, {
    model,
    input: prompt,
    system_prompt: systemInstruction(),
    temperature: 0.2,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });
  if (native.ok && native.body && typeof native.body === "object") {
    const body = native.body as NativeBody;
    const output = bounded(text(Array.isArray(body.output) ? body.output.find(item => item.type === "message")?.content : null));
    if (output) {
      const promptTokens = n(body.stats?.input_tokens);
      const completionTokens = n(body.stats?.total_output_tokens);
      const reasoningTokens = n(body.stats?.reasoning_output_tokens);
      return {
        ok: true,
        provider: "lm-studio",
        providerLabel: "LM Studio",
        model: body.model_instance_id || model,
        output,
        responseTimeMs: native.elapsedMs,
        promptTokens,
        completionTokens,
        reasoningTokens,
        totalTokens: promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null,
        tokensPerSecond: n(body.stats?.tokens_per_second),
        detail: "Advisory review completed through LM Studio's local native API.",
      };
    }
  }

  const compatible = await postJson(`${LM_STUDIO_URL}/v1/chat/completions`, {
    model,
    messages: [
      { role: "system", content: systemInstruction() },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: false,
  });
  if (!compatible.ok || !compatible.body || typeof compatible.body !== "object") {
    return emptyFailure("lm-studio", "LM Studio", model, `LM Studio could not complete the advisory review. The final local HTTP status was ${compatible.status}.`, compatible.elapsedMs);
  }
  const body = compatible.body as CompatBody;
  const output = bounded(text(body.choices?.[0]?.message?.content));
  if (!output) return emptyFailure("lm-studio", "LM Studio", body.model || model, "LM Studio returned no final advisory review text.", compatible.elapsedMs);
  const promptTokens = n(body.usage?.prompt_tokens);
  const completionTokens = n(body.usage?.completion_tokens);
  const totalTokens = n(body.usage?.total_tokens) ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null);
  return {
    ok: true,
    provider: "lm-studio",
    providerLabel: "LM Studio",
    model: body.model || model,
    output,
    responseTimeMs: compatible.elapsedMs,
    promptTokens,
    completionTokens,
    reasoningTokens: n(body.usage?.completion_tokens_details?.reasoning_tokens),
    totalTokens,
    tokensPerSecond: null,
    detail: "Advisory review completed through LM Studio's local compatibility API.",
  };
}

async function reviewWithOllama(model: string, purpose: string, snapshot: AiWorkSnapshot): Promise<LocalAiReviewResult> {
  if (model.toLowerCase().includes("cloud")) {
    return emptyFailure("ollama", "Ollama", model, "Wayfound will not invoke an Ollama model identified as cloud-backed.");
  }
  const result = await postJson(`${OLLAMA_URL}/api/chat`, {
    model,
    messages: [
      { role: "system", content: systemInstruction() },
      { role: "user", content: reviewPrompt(purpose, snapshot) },
    ],
    stream: false,
    think: false,
    options: { temperature: 0.2, num_predict: MAX_OUTPUT_TOKENS },
  });
  if (!result.ok || !result.body || typeof result.body !== "object") {
    return emptyFailure("ollama", "Ollama", model, `Ollama could not complete the advisory review. The local HTTP status was ${result.status}.`, result.elapsedMs);
  }
  const body = result.body as OllamaBody;
  const output = bounded(text(body.message?.content));
  if (!output) return emptyFailure("ollama", "Ollama", body.model || model, "Ollama returned no advisory review text.", result.elapsedMs);
  const promptTokens = n(body.prompt_eval_count);
  const completionTokens = n(body.eval_count);
  const evalDurationNs = n(body.eval_duration);
  const tokensPerSecond = completionTokens !== null && evalDurationNs && evalDurationNs > 0
    ? Math.round((completionTokens / (evalDurationNs / 1_000_000_000)) * 10) / 10
    : null;
  return {
    ok: true,
    provider: "ollama",
    providerLabel: "Ollama",
    model: body.model || model,
    output,
    responseTimeMs: result.elapsedMs,
    promptTokens,
    completionTokens,
    reasoningTokens: null,
    totalTokens: promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null,
    tokensPerSecond,
    detail: "Advisory review completed through Ollama's local API.",
  };
}

export async function runLocalAiWorkReview(purpose: string, snapshot: AiWorkSnapshot): Promise<LocalAiReviewResult> {
  const status = await detectLocalAi();
  if (!status.provider || !status.model) return emptyFailure(status.provider, status.providerLabel, status.model, status.detail);
  try {
    return status.provider === "lm-studio"
      ? await reviewWithLmStudio(status.model, purpose, snapshot)
      : await reviewWithOllama(status.model, purpose, snapshot);
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError"
      ? "The local AI review timed out before inference completed."
      : "The local AI review could not complete.";
    return emptyFailure(status.provider, status.providerLabel, status.model, detail);
  }
}
