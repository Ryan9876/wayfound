import assert from 'node:assert/strict';
import test from 'node:test';
import { generateText, resolveAiProvider } from '../src/server/ai/provider.ts';

test('AI is disabled by default', () => {
  assert.deepEqual(resolveAiProvider({}), { provider: 'off', enabled: false, local: true });
});

test('Ollama defaults to the local OpenAI-compatible endpoint', () => {
  const config = resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'ollama', WAYFOUND_AI_MODEL: 'qwen3-coder:30b' });
  assert.equal(config.local, true);
  assert.equal(config.baseUrl, 'http://127.0.0.1:11434/v1');
  assert.equal(config.model, 'qwen3-coder:30b');
});

test('LM Studio defaults to the local OpenAI-compatible endpoint', () => {
  const config = resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'lmstudio', WAYFOUND_AI_MODEL: 'local-model' });
  assert.equal(config.local, true);
  assert.equal(config.baseUrl, 'http://127.0.0.1:1234/v1');
});

test('external AI is blocked unless explicitly enabled', () => {
  assert.throws(
    () => resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'openai-compatible', WAYFOUND_AI_BASE_URL: 'https://api.openai.com/v1', WAYFOUND_AI_API_KEY: 'test' }),
    /External AI is disabled/,
  );
});

test('external AI requires a key after outbound access is enabled', () => {
  assert.throws(
    () => resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'openai-compatible', WAYFOUND_AI_BASE_URL: 'https://api.openai.com/v1', WAYFOUND_ALLOW_EXTERNAL_AI: 'true' }),
    /WAYFOUND_AI_API_KEY is required/,
  );
});

test('local OpenAI-compatible endpoints do not require external opt-in', () => {
  const config = resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'openai-compatible', WAYFOUND_AI_BASE_URL: 'http://localhost:9999/v1', WAYFOUND_AI_MODEL: 'local' });
  assert.equal(config.local, true);
  assert.equal(config.enabled, true);
});

test('generateText uses the configured adapter without granting authority', async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200, json: async () => ({ model: 'local-model', choices: [{ message: { content: 'draft suggestion' } }] }) };
  };
  const result = await generateText({
    config: resolveAiProvider({ WAYFOUND_AI_PROVIDER: 'lmstudio', WAYFOUND_AI_MODEL: 'local-model' }),
    messages: [{ role: 'user', content: 'Suggest a requirement.' }],
    fetchImpl,
  });
  assert.equal(result.text, 'draft suggestion');
  assert.equal(request.url, 'http://127.0.0.1:1234/v1/chat/completions');
  assert.equal(request.init.headers.Authorization, undefined);
});
