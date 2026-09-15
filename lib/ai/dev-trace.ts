import "server-only";

export type AiDevTraceMetrics = {
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  timeToFirstTokenMs: number | null;
};

export type AiDevTraceEntry = {
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
  metrics: AiDevTraceMetrics;
};

type TraceStore = {
  nextId: number;
  entries: AiDevTraceEntry[];
};

type TraceInput = Omit<AiDevTraceEntry, "id" | "timestamp" | "requestBody" | "responseBody" | "metrics"> & {
  requestBody: unknown;
  responseBody: unknown;
  metrics?: Partial<AiDevTraceMetrics>;
};

const TRACE_LIMIT = 120;
const BODY_LIMIT = 12_000;
const SECRET_KEYS = new Set([
  "authorization",
  "api_key",
  "apikey",
  "api-key",
  "password",
  "access_token",
  "refresh_token",
  "client_secret",
  "secret",
]);

const globalTrace = globalThis as typeof globalThis & {
  __wayfoundAiDevTrace?: TraceStore;
};

function store(): TraceStore {
  if (!globalTrace.__wayfoundAiDevTrace) {
    globalTrace.__wayfoundAiDevTrace = { nextId: 1, entries: [] };
  }
  return globalTrace.__wayfoundAiDevTrace;
}

function isLoopbackOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  } catch {
    return false;
  }
}

export function aiDevelopmentConsoleEnabled(): boolean {
  return process.env.WAYFOUND_SINGLE_USER_MODE === "true"
    && process.env.WAYFOUND_LOCAL_TEST === "1"
    && process.env.WAYFOUND_AI_DEV_CONSOLE === "true"
    && isLoopbackOrigin(process.env.APP_ORIGIN);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[bounded]";
  if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SECRET_KEYS.has(key.toLowerCase()) ? "[redacted]" : sanitize(child, depth + 1);
  }
  return result;
}

function configuredSecrets(): string[] {
  return [
    process.env.OPENAI_API_KEY,
    process.env.WAYFOUND_SINGLE_USER_OWNER_PASSWORD,
  ].filter((value): value is string => Boolean(value && value.length >= 6));
}

function stringify(value: unknown): string {
  let text: string;
  try {
    text = typeof value === "string" ? value : JSON.stringify(sanitize(value), null, 2);
  } catch {
    text = "[unserializable]";
  }
  for (const secret of configuredSecrets()) {
    text = text.split(secret).join("[redacted]");
  }
  return text.length > BODY_LIMIT ? `${text.slice(0, BODY_LIMIT)}\n…[truncated]` : text;
}

function n(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function inferMetrics(responseBody: unknown): AiDevTraceMetrics {
  const body = responseBody && typeof responseBody === "object" ? responseBody as Record<string, unknown> : {};
  const usage = body.usage && typeof body.usage === "object" ? body.usage as Record<string, unknown> : {};
  const stats = body.stats && typeof body.stats === "object" ? body.stats as Record<string, unknown> : {};
  const outputDetails = usage.output_tokens_details && typeof usage.output_tokens_details === "object"
    ? usage.output_tokens_details as Record<string, unknown>
    : usage.completion_tokens_details && typeof usage.completion_tokens_details === "object"
      ? usage.completion_tokens_details as Record<string, unknown>
      : {};

  const promptTokens = n(usage.input_tokens) ?? n(usage.prompt_tokens) ?? n(stats.input_tokens) ?? n(body.prompt_eval_count);
  const completionTokens = n(usage.output_tokens) ?? n(usage.completion_tokens) ?? n(stats.total_output_tokens) ?? n(body.eval_count);
  const reasoningTokens = n(outputDetails.reasoning_tokens) ?? n(stats.reasoning_output_tokens);
  const reportedTotal = n(usage.total_tokens);
  const totalTokens = reportedTotal ?? (promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null);
  const tokensPerSecond = n(stats.tokens_per_second) ?? (() => {
    const evalCount = n(body.eval_count);
    const evalDuration = n(body.eval_duration);
    return evalCount !== null && evalDuration !== null && evalDuration > 0
      ? Math.round((evalCount / (evalDuration / 1_000_000_000)) * 10) / 10
      : null;
  })();
  const firstTokenSeconds = n(stats.time_to_first_token_seconds);

  return {
    promptTokens,
    completionTokens,
    reasoningTokens,
    totalTokens,
    tokensPerSecond,
    timeToFirstTokenMs: firstTokenSeconds === null ? null : Math.round(firstTokenSeconds * 1000),
  };
}

export function recordAiDevTrace(input: TraceInput): void {
  if (!aiDevelopmentConsoleEnabled()) return;
  const target = store();
  const inferred = inferMetrics(input.responseBody);
  const metrics: AiDevTraceMetrics = {
    promptTokens: input.metrics?.promptTokens ?? inferred.promptTokens,
    completionTokens: input.metrics?.completionTokens ?? inferred.completionTokens,
    reasoningTokens: input.metrics?.reasoningTokens ?? inferred.reasoningTokens,
    totalTokens: input.metrics?.totalTokens ?? inferred.totalTokens,
    tokensPerSecond: input.metrics?.tokensPerSecond ?? inferred.tokensPerSecond,
    timeToFirstTokenMs: input.metrics?.timeToFirstTokenMs ?? inferred.timeToFirstTokenMs,
  };

  target.entries.push({
    ...input,
    id: target.nextId++,
    timestamp: new Date().toISOString(),
    requestBody: stringify(input.requestBody),
    responseBody: stringify(input.responseBody),
    metrics,
  });
  if (target.entries.length > TRACE_LIMIT) {
    target.entries.splice(0, target.entries.length - TRACE_LIMIT);
  }
}

export function getAiDevTrace(): AiDevTraceEntry[] {
  if (!aiDevelopmentConsoleEnabled()) return [];
  return [...store().entries];
}

export function clearAiDevTrace(): void {
  if (!aiDevelopmentConsoleEnabled()) return;
  store().entries.length = 0;
}
