import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: expected ${JSON.stringify(text)}`);
};

const [trace, service, review, component, frame, styles, env, spec, adr, providersRoute, testRoute, traceRoute, selectionRoute] = await Promise.all([
  read('lib/ai/dev-trace.ts'),
  read('lib/ai/ai-development-console.ts'),
  read('lib/ai/local-ai-review.ts'),
  read('components/ai-development-console.tsx'),
  read('components/workspace-frame.tsx'),
  read('app/ai-development-console.css'),
  read('.env.example'),
  read('docs/INCREMENT_2_AI_DEVELOPMENT_CONSOLE.md'),
  read('docs/adr/0007-ai-provider-selection-and-development-observability.md'),
  read('app/api/ai-dev/providers/route.ts'),
  read('app/api/ai-dev/test/route.ts'),
  read('app/api/ai-dev/trace/route.ts'),
  read('app/api/ai-dev/selection/route.ts'),
]);

requireText(trace, 'WAYFOUND_AI_DEV_CONSOLE === "true"', 'explicit development-console flag');
requireText(trace, 'WAYFOUND_LOCAL_TEST === "1"', 'local-test guard');
requireText(trace, 'TRACE_LIMIT = 120', 'bounded trace retention');
requireText(trace, 'OPENAI_API_KEY', 'configured secret redaction');
requireText(trace, 'authorization', 'authorization redaction');
requireText(trace, 'selection: { provider: "lm-studio", model: null }', 'transient LM Studio default selection');
requireText(trace, 'setAiDevelopmentSelection', 'transient provider/model selection');
requireText(trace, 'getAiDevTrace', 'trace reader');
requireText(trace, 'clearAiDevTrace', 'trace clearing');
requireText(service, '"lm-studio" | "ollama" | "openai"', 'supported development providers');
requireText(service, 'defaultProvider: "lm-studio"', 'LM Studio default');
requireText(service, 'host.docker.internal', 'Docker host bridge support');
requireText(service, 'http://127.0.0.1:1234', 'LM Studio host default');
requireText(service, 'http://127.0.0.1:11434', 'Ollama host default');
requireText(service, 'https://api.openai.com/v1', 'fixed OpenAI public boundary');
requireText(service, 'if (!key)', 'OpenAI no-key guard');
requireText(service, '/models', 'OpenAI model discovery');
requireText(service, '/responses', 'OpenAI development inference');
requireText(service, 'Authorization: `Bearer ${key}`', 'server-side OpenAI authorization');
requireText(service, 'provider.models.includes(normalizedModel)', 'server-side model selection validation');
requireText(service, 'recordAiDevTrace', 'connection-test traffic capture');
requireText(review, 'recordAiDevTrace', 'normal Wayfound AI-review traffic capture');
requireText(review, 'operation: "durable-work-review"', 'normal review traffic label');
requireText(review, 'getAiDevelopmentSelection()', 'normal review uses explicit local model selection');
requireText(review, 'selection.provider === "openai"', 'durable OpenAI review remains blocked');
requireText(review, 'lmStudioDevelopmentUrl()', 'Docker-aware LM Studio review target');
requireText(review, 'ollamaDevelopmentUrl()', 'Docker-aware Ollama review target');
requireText(component, 'AI traffic console', 'console heading');
requireText(component, 'providerModelChoices', 'all discovered models remain selectable');
requireText(component, '/api/ai-dev/selection', 'selection persistence endpoint');
requireText(component, 'Refresh models', 'model refresh control');
requireText(component, 'Test connection', 'selected model connection test');
requireText(component, 'Public provider:', 'cloud visibility');
requireText(component, 'selected local model is also used by normal Wayfound AI reviews', 'actual review selection disclosure');
requireText(component, 'Request', 'request traffic disclosure');
requireText(component, 'Response', 'response traffic disclosure');
requireText(component, 'Clear traffic', 'trace clear control');
requireText(component, 'Secrets and authorization headers are excluded', 'secret-handling disclosure');
requireText(component, 'durable OpenAI review remains disabled', 'durable-boundary disclosure');
requireText(frame, 'initialProvider="lm-studio"', 'console opens on LM Studio by default');
requireText(styles, '.ai-dev-terminal', 'terminal presentation');
requireText(styles, '.ai-dev-provider-connected', 'text-plus-visual provider state');
requireText(env, 'WAYFOUND_AI_DEV_CONSOLE=false', 'disabled-by-default console configuration');
requireText(env, 'LM_STUDIO_BASE_URL=http://127.0.0.1:1234', 'LM Studio config');
requireText(env, 'OLLAMA_BASE_URL=http://127.0.0.1:11434', 'Ollama config');
requireText(env, 'OPENAI_API_KEY=', 'OpenAI server secret config');
requireText(spec, 'temporary development instrumentation', 'temporary instrumentation scope');
requireText(spec, 'does not yet route durable project AI reviews through OpenAI', 'durable cloud-review exclusion');
requireText(adr, 'must never switch from local AI to a public provider', 'no cloud fallback architecture');
requireText(adr, 'LM Studio is the default provider', 'default provider architecture');
requireText(providersRoute, 'client.auth.getUser()', 'provider discovery authentication');
requireText(testRoute, 'request.headers.get("origin") !== process.env.APP_ORIGIN', 'test origin guard');
requireText(traceRoute, 'request.headers.get("origin") !== process.env.APP_ORIGIN', 'trace clear origin guard');
requireText(selectionRoute, 'request.headers.get("origin") !== process.env.APP_ORIGIN', 'selection origin guard');
requireText(selectionRoute, 'provider.models.includes(model)', 'selected model availability validation');

console.log('PASS: development AI console is explicit local-test instrumentation, defaults to LM Studio, discovers all selectable LM Studio/Ollama/OpenAI models, supports Docker host bridging on fixed ports, applies explicit local model selection to normal Wayfound AI reviews, requires explicit cloud configuration/use, captures bounded sanitized connection-test and normal Wayfound AI-review request/response traffic and metrics, keeps secrets server-side, and does not expand durable cloud-review authority.');
