import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const launcher = readFileSync('scripts/wayfound-local-test.mjs', 'utf8');
const gitignore = readFileSync('.gitignore', 'utf8');
const packageSpec = readFileSync('docs/LOCAL_TEST_REFRESH_PACKAGE.md', 'utf8');
const quickStart = readFileSync('docs/LOCAL_TEST_QUICK_START.md', 'utf8');

const plan = JSON.parse(execFileSync(process.execPath, ['scripts/wayfound-local-test.mjs', 'plan', '--json'], { encoding: 'utf8' }));

assert.equal(plan.runtime.application, 'host-nextjs');
assert.equal(plan.runtime.backend, 'supabase-cli-docker');
assert.equal(plan.appOrigin, 'http://127.0.0.1:3000');
assert.equal(plan.localProviders.default, 'lm-studio');
assert.equal(plan.localProviders.lmStudio, 'http://127.0.0.1:1234');
assert.equal(plan.localProviders.ollama, 'http://127.0.0.1:11434');
assert.equal(plan.refresh.git, 'fetch-origin-then-ff-only');
assert.equal(plan.refresh.launcherReload, 'reexec-after-fast-forward');
assert.equal(plan.refresh.migrations, 'supabase migration up --local');
assert.equal(plan.refresh.destructiveReset, false);
assert.equal(plan.refresh.preservesLocalData, true);
assert.equal(plan.reset.command, 'supabase db reset --local');
assert.equal(plan.reset.destructive, true);
assert.equal(plan.reset.explicitConfirmation, true);
assert.equal(plan.reset.loopbackOnly, true);
assert.equal(plan.ai.developmentConsole, true);
assert.equal(plan.ai.publicProvider, 'explicit-only');
assert.equal(plan.ai.silentCloudFallback, false);
assert.equal(plan.secrets.printed, false);
assert.equal(plan.secrets.committed, false);

for (const script of ['local:refresh', 'local:start', 'local:status', 'local:stop', 'local:reset', 'test:local-test-package']) {
  assert(packageJson.scripts?.[script], `package.json is missing ${script}`);
}
assert.equal(packageJson.scripts['local:refresh'], 'node scripts/wayfound-local-test.mjs refresh');
assert.equal(packageJson.scripts['local:start'], 'node scripts/wayfound-local-test.mjs start');
assert.equal(packageJson.scripts['local:status'], 'node scripts/wayfound-local-test.mjs status');
assert.equal(packageJson.scripts['local:stop'], 'node scripts/wayfound-local-test.mjs stop');
assert.equal(packageJson.scripts['local:reset'], 'node scripts/wayfound-local-test.mjs reset');
assert.equal(packageJson.scripts.lint, 'next typegen && tsc --noEmit');

assert(gitignore.split(/\r?\n/).includes('.wayfound/'), '.wayfound runtime state must be ignored');
assert(gitignore.split(/\r?\n/).includes('next-env.d.ts'), 'Next.js generated next-env.d.ts must be ignored');
assert(launcher.includes("['merge', '--ff-only'"), 'refresh must use fast-forward-only Git merge');
assert(launcher.includes("gitOutput(['rev-parse', 'HEAD'])"), 'refresh must detect when Git fast-forward changes the launcher checkout');
assert(launcher.includes('WAYFOUND_REFRESH_REEXEC'), 'refresh must re-exec the newly pulled launcher after a fast-forward');
assert(launcher.includes("['scripts/wayfound-local-test.mjs', 'start'"), 'refreshed launcher must continue with local:start semantics');
assert(!launcher.includes('reset --hard'), 'launcher must not hard-reset Git');
assert(!launcher.includes('checkout -f'), 'launcher must not force-checkout Git');
assert(launcher.includes("['migration', 'up', '--local']"), 'normal backend setup must apply pending migrations');
assert(launcher.includes("['db', 'reset', '--local']"), 'explicit reset path must use local database reset');
assert(launcher.includes("if (mode === 'reset')"), 'database reset must be isolated to an explicit reset mode');
assert(launcher.includes('Type RESET to continue'), 'interactive destructive reset confirmation is required');
assert(launcher.includes("WAYFOUND_AI_DEV_CONSOLE: 'true'"), 'quick test runtime must enable the development AI console');
assert(launcher.includes('LM_STUDIO_BASE_URL'), 'LM Studio endpoint must be supplied to the local app');
assert(launcher.includes('OLLAMA_BASE_URL'), 'Ollama endpoint must be supplied to the local app');
assert(!launcher.includes('console.log(owner.password'), 'launcher must not print the owner password');
assert(!launcher.includes('console.log(apiKey'), 'launcher must not print public-provider API keys');

assert(packageSpec.includes('**Status:** In progress'), 'package slice must remain In progress until Mac execution is recorded');
assert(packageSpec.includes('Mac execution using Docker Desktop is still required'), 'package validation boundary must require intended Mac execution');
for (const command of ['npm run local:refresh', 'npm run local:start', 'npm run local:status', 'npm run local:stop', 'npm run local:reset']) {
  assert(quickStart.includes(command), `LOCAL_TEST_QUICK_START.md must document ${command}`);
}
assert(quickStart.includes('preserves local project data'), 'quick-start guide must state the non-destructive refresh behavior');
assert(quickStart.includes('LM Studio') && quickStart.includes('Ollama'), 'quick-start guide must identify both local providers');
assert(quickStart.includes('OpenAI') && quickStart.includes('explicit'), 'quick-start guide must keep public-provider use explicit');

console.log('PASS: local refresh package contract preserves the host-app/Supabase-Docker architecture, re-execs newly pulled launcher code, uses fast-forward-only updates and non-destructive migrations, separates explicit reset, ignores generated/runtime state, enables the validated AI console, and documents LM Studio/Ollama plus optional explicit cloud testing.');
