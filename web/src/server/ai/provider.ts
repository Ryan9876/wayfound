import { configurationError } from '../domain/errors';

export type AiProviderId = 'off' | 'ollama' | 'lmstudio' | 'openai-compatible';

export type AiProviderConfig = {
  provider: AiProviderId;
  enabled: boolean;
  local: boolean;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

type AiEnvironment = Record<string, string | undefined>;

function loopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveAiProvider(env: AiEnvironment = process.env): AiProviderConfig {
  const provider = (env.WAYFOUND_AI_PROVIDER?.trim().toLowerCase() || 'off') as AiProviderId;
  if (provider === 'off') return { provider, enabled: false, local: true };

  if (provider === 'ollama') {
    return {
      provider,
      enabled: true,
      local: true,
      baseUrl: normalizeBaseUrl(env.WAYFOUND_AI_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1'),
      model: env.WAYFOUND_AI_MODEL?.trim(),
    };
  }

  if (provider === 'lmstudio') {
    return {
      provider,
      enabled: true,
      local: true,
      baseUrl: normalizeBaseUrl(env.WAYFOUND_AI_BASE_URL?.trim() || 'http://127.0.0.1:1234/v1'),
      model: env.WAYFOUND_AI_MODEL?.trim(),
    };
  }

  if (provider === 'openai-compatible') {
    const rawBaseUrl = env.WAYFOUND_AI_BASE_URL?.trim();
    if (!rawBaseUrl) throw configurationError('WAYFOUND_AI_BASE_URL is required for an OpenAI-compatible provider.');
    const baseUrl = normalizeBaseUrl(rawBaseUrl);
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw configurationError('WAYFOUND_AI_BASE_URL must be a valid URL.');
    }
    const local = loopbackHost(parsed.hostname);
    if (!local && env.WAYFOUND_ALLOW_EXTERNAL_AI !== 'true') {
      throw configurationError('External AI is disabled. Set WAYFOUND_ALLOW_EXTERNAL_AI=true only after choosing to send project content outside this computer.');
    }
    if (!local && !env.WAYFOUND_AI_API_KEY?.trim()) {
      throw configurationError('WAYFOUND_AI_API_KEY is required for an external OpenAI-compatible provider.');
    }
    return {
      provider,
      enabled: true,
      local,
      baseUrl,
      model: env.WAYFOUND_AI_MODEL?.trim(),
      apiKey: env.WAYFOUND_AI_API_KEY?.trim(),
    };
  }

  throw configurationError(`Unsupported WAYFOUND_AI_PROVIDER: ${provider}`);
}

export async function generateText(input: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  config?: AiProviderConfig;
  fetchImpl?: typeof fetch;
}): Promise<{ text: string; provider: AiProviderId; model: string }> {
  const config = input.config ?? resolveAiProvider();
  if (!config.enabled || !config.baseUrl) throw configurationError('AI is disabled for this Wayfound installation.');
  if (!config.model) throw configurationError('WAYFOUND_AI_MODEL is required before using AI assistance.');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages: input.messages, stream: false }),
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);

  const body = await response.json() as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI provider returned no message content.');
  return { text, provider: config.provider, model: body.model || config.model };
}
