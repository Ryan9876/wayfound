import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: expected ${JSON.stringify(text)}`);
};

const [detector, indicator, frame, styles, spec, adr] = await Promise.all([
  read('lib/ai/local-ai.ts'),
  read('components/local-ai-status.tsx'),
  read('components/workspace-frame.tsx'),
  read('app/local-ai-status.css'),
  read('docs/INCREMENT_2_LOCAL_AI_CONNECTION.md'),
  read('docs/adr/0005-single-human-ai-product-model.md'),
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
requireText(indicator, 'Connected', 'connected text state');
requireText(indicator, 'Ready', 'ready text state');
requireText(indicator, 'Offline', 'offline text state');
requireText(frame, 'await detectLocalAi()', 'signed-in discovery call');
requireText(frame, '<LocalAiStatus status={aiStatus} />', 'visible connection indicator');
requireText(styles, '.local-ai-status-connected', 'connected visual state');
requireText(styles, '.local-ai-status-ready', 'ready visual state');
requireText(styles, '.local-ai-status-offline', 'offline visual state');
requireText(spec, 'LM Studio with a loaded LLM', 'selection contract');
requireText(spec, 'Wayfound must not silently switch to a public/cloud provider', 'failure contract');
requireText(adr, 'local-first provider boundary', 'architecture boundary');

console.log('PASS: local AI discovery is loopback-only, auto-detects LM Studio and Ollama, prefers a running LM Studio model, exposes text plus visual connection state, prefers Glimmer when present, uses bounded probes, and has no silent cloud fallback.');
