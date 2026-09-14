import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: expected ${JSON.stringify(text)}`);
};

const [envExample, frame, layout, css, proxy, charter, requirements, delivery] = await Promise.all([
  read('.env.example'),
  read('components/workspace-frame.tsx'),
  read('app/layout.tsx'),
  read('app/single-user-mode.css'),
  read('proxy.ts'),
  read('docs/PROJECT_CHARTER.md'),
  read('docs/PRODUCT_REQUIREMENTS.md'),
  read('docs/DELIVERY_PLAN.md'),
]);

requireText(envExample, 'WAYFOUND_SINGLE_USER_MODE=false', 'environment contract');
requireText(frame, 'process.env.WAYFOUND_SINGLE_USER_MODE === "true"', 'workspace frame mode gate');
requireText(frame, '!singleUserMode && <Link href="/specialist-reviews">Specialist reviews</Link>', 'specialist navigation gate');
requireText(layout, 'className={singleUserMode ? "single-user-mode" : undefined}', 'single-user body marker');
requireText(css, '.single-user-mode #technical-decisions', 'technical decision human-review surface');
requireText(css, '.single-user-mode #technical-requirements', 'technical requirement human-review surface');
requireText(css, '.single-user-mode .specialist-review-panel', 'artifact human-review surface');
requireText(css, 'a[href="/handoffs"]', 'handoffs navigation surface');
requireText(proxy, 'request.nextUrl.pathname === "/specialist-reviews"', 'specialist route gate');
requireText(proxy, 'new URL("/workspaces", request.url)', 'specialist route redirect');
requireText(proxy, 'request.nextUrl.pathname === "/handoffs"', 'handoffs route gate');
requireText(proxy, 'new URL("/records", request.url)', 'handoffs route redirect');
requireText(charter, 'one authenticated product owner', 'single-human charter');
requireText(charter, 'AI is a system capability, not a second human participant and not an independent authority', 'AI authority boundary');
requireText(requirements, 'WF-AI-002', 'AI self-approval prohibition');
requireText(delivery, 'collaborator membership/administration', 'removed collaboration scope record');

console.log('PASS: ADR-0005 single-user mode exposes one human-owner product direction, hides in-app human reviewer/handoff entry points, preserves explicit AI advisory boundaries, and records multi-human collaboration as deferred scope.');
