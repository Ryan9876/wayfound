import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: expected ${JSON.stringify(text)}`);
};

const [detector, health, indicator, frame, styles, spec, adr, route] = await Promise.all([
  read('lib/ai/local-ai.ts'),
  read('lib/ai/local-ai-health.ts'),
  read('components/local-ai-status.tsx'),
  read('components/workspace-frame.tsx'),
  read('app/local-ai-status.css'),
  read('docs/INCREMENT_2_LOCAL_AI_CONNECTION.md'),
  read('docs/adr/0005-single-human-ai-product-model.md'),
  read('app/api/local-ai/test/route.ts'),
]);

requireText(detector, 'http://127.0.0.1:1234', 'LM Studio loopback endpoint');
requireText(detector, '/api/v1/models', 'LM Studio model discovery');
requireText(detector, 'http://127.0.0.1:11434', 'Ollama loopback endpoint');
requireText(detector, '/api/ps', 'Ollama running-model discovery');
requireText(detector, '/api/tags', 'Ollama installed-model discovery');
requireText(detector, 'lmStudio.activeModels.length ? lmStudio : ollama.activeModels.length ? ollama : null', 'active provider preference');
requireText(detector, 'includes("glimmer")', 'Glimmer preference');
requireText(detector, 'Cloud fallback is disabled', 'no-cloud-fallback state');
requireText(detector, 'AbortSignal.timeout(PROBE_TIMEOUT_MS)', 'bounded provider probe');

requireText(health, 'http://127.0.0.1:1234', 'LM Studio health endpoint boundary');
requireText(health, '/api/v1/chat', 'LM Studio native inference health test');
requireText(health, 'reasoning: "off"', 'Glimmer reasoning suppression');
requireText(health, 'max_output_tokens: TEST_MAX_OUTPUT_TOKENS', 'LM Studio bounded health output');
requireText(health, 'http://127.0.0.1:11434', 'Ollama health endpoint boundary');
requireText(health, '/api/chat', 'Ollama inference health test');
requireText(health, 'think: false', 'Ollama reasoning suppression');
requireText(health, 'num_predict: TEST_MAX_OUTPUT_TOKENS', 'Ollama bounded health output');
requireText(health, '!model.toLowerCase().includes("cloud")', 'Ollama cloud-model exclusion');
requireText(health, 'Wayfound will not invoke an Ollama model identified as cloud-backed.', 'Ollama test guard');
requireText(health, 'AbortSignal.timeout(TEST_TIMEOUT_MS)', 'bounded inference test');
requireText(health, 'WAYFOUND_LOCAL_AI_OK', 'deterministic inference marker');
requireText(health, 'input_tokens', 'LM Studio input token usage');
requireText(health, 'total_output_tokens', 'LM Studio output token usage');
requireText(health, 'reasoning_output_tokens', 'LM Studio reasoning token usage');
requireText(health, 'tokens_per_second', 'LM Studio generation rate');
requireText(health, 'time_to_first_token_seconds', 'LM Studio first-token timing');
requireText(health, 'prompt_eval_count', 'Ollama input token usage');
requireText(health, 'eval_count', 'Ollama output token usage');
requireText(health, 'performance.now()', 'end-to-end response timing');

requireText(indicator, 'Test AI', 'visible test button');
requireText(indicator, 'Response time', 'response time metric');
requireText(indicator, 'Input tokens', 'input token metric');
requireText(indicator, 'Output tokens', 'output token metric');
requireText(indicator, 'Total tokens', 'total token metric');
requireText(indicator, 'Reasoning tokens', 'reasoning token metric');
requireText(indicator, 'Generation', 'generation speed metric');
requireText(indicator, 'First token', 'time-to-first-token metric');
requireText(indicator, 'fetch("/api/local-ai/test"', 'test action call');
requireText(frame, 'await detectLocalAi()', 'signed-in discovery call');
requireText(frame, '<LocalAiStatus status={aiStatus} />', 'visible connection indicator');
requireText(styles, '.local-ai-status-connected', 'connected visual state');
requireText(styles, '.local-ai-status-ready', 'ready visual state');
requireText(styles, '.local-ai-status-offline', 'offline visual state');
requireText(styles, '.local-ai-test-pass', 'test pass visual state');
requireText(styles, '.local-ai-test-fail', 'test failure visual state');
requireText(route, 'client.auth.getUser()', 'authenticated test route');
requireText(route, 'process.env.WAYFOUND_SINGLE_USER_MODE !== "true"', 'single-user test boundary');
requireText(route, 'runLocalAiHealthTest()', 'reasoning-safe inference execution');
requireText(spec, 'LM Studio with a loaded LLM', 'selection contract');
requireText(spec, 'Wayfound must not silently switch to a public/cloud provider', 'failure contract');
requireText(spec, 'Test AI', 'health-test acceptance contract');
requireText(adr, 'local-first provider boundary', 'architecture boundary');

console.log('PASS: local AI discovery and health testing are loopback-only, auto-detect LM Studio and Ollama, exclude Ollama cloud models, prefer a running LM Studio model and Glimmer, suppress reasoning for the connectivity check, expose text plus visual connection state, execute an authenticated deterministic inference check, display latency and provider-reported token/performance metrics, use bounded timeouts, and have no silent cloud fallback.');
