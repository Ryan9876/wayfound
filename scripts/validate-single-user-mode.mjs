import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: expected ${JSON.stringify(text)}`);
};

const [envExample, frame, layout, css, proxy, autoSession, signInPage, charter, requirements, delivery, packageJson, singleUserSeed, localBackend, localDevelopment, noLoginSpec, adr6] = await Promise.all([
  read('.env.example'),
  read('components/workspace-frame.tsx'),
  read('app/layout.tsx'),
  read('app/single-user-mode.css'),
  read('proxy.ts'),
  read('lib/auth/single-user-auto-session.ts'),
  read('app/sign-in/page.tsx'),
  read('docs/PROJECT_CHARTER.md'),
  read('docs/PRODUCT_REQUIREMENTS.md'),
  read('docs/DELIVERY_PLAN.md'),
  read('package.json'),
  read('scripts/seed-single-user-local.mjs'),
  read('scripts/local-backend.mjs'),
  read('docs/LOCAL_DEVELOPMENT.md'),
  read('docs/INCREMENT_2_SINGLE_USER_NO_LOGIN.md'),
  read('docs/adr/0006-local-single-user-auto-session.md'),
]);

requireText(envExample, 'WAYFOUND_SINGLE_USER_MODE=false', 'environment contract');
requireText(envExample, 'WAYFOUND_SINGLE_USER_AUTO_SIGN_IN=false', 'no-login environment contract');
requireText(envExample, 'WAYFOUND_LOCAL_TEST=0', 'local-test environment guard');
requireText(frame, 'process.env.WAYFOUND_SINGLE_USER_MODE === "true"', 'workspace frame mode gate');
requireText(frame, '!singleUserMode && <Link href="/specialist-reviews">Specialist reviews</Link>', 'specialist navigation gate');
requireText(frame, '!noInteractiveLogin && <form action={signOut}>', 'sign-out hidden in no-login mode');
requireText(layout, 'className={singleUserMode ? "single-user-mode" : undefined}', 'single-user body marker');
requireText(css, '.single-user-mode #technical-decisions', 'technical decision human-review surface');
requireText(css, '.single-user-mode #technical-requirements', 'technical requirement human-review surface');
requireText(css, '.single-user-mode .specialist-review-panel', 'artifact human-review surface');
requireText(css, 'a[href="/handoffs"]', 'handoffs navigation surface');
requireText(proxy, 'request.nextUrl.pathname === "/specialist-reviews"', 'specialist route gate');
requireText(proxy, 'new URL("/workspaces", request.url)', 'workspace redirect');
requireText(proxy, 'request.nextUrl.pathname === "/handoffs"', 'handoffs route gate');
requireText(proxy, 'client.auth.signInWithPassword({ email: autoSession.email, password: autoSession.password })', 'automatic owner session');
requireText(proxy, 'request.nextUrl.pathname === "/sign-in"', 'sign-in route bypass');
requireText(autoSession, 'process.env.WAYFOUND_SINGLE_USER_AUTO_SIGN_IN !== "true"', 'explicit auto-sign-in guard');
requireText(autoSession, 'process.env.WAYFOUND_LOCAL_TEST !== "1"', 'explicit local-test runtime guard');
requireText(autoSession, 'url.hostname === "127.0.0.1" || url.hostname === "localhost"', 'loopback runtime guard');
requireText(autoSession, 'WAYFOUND_SINGLE_USER_OWNER_EMAIL', 'owner email configuration');
requireText(autoSession, 'WAYFOUND_SINGLE_USER_OWNER_PASSWORD', 'owner password configuration');
requireText(signInPage, 'Interactive login is intentionally disabled in this single-user mode.', 'no interactive fallback');
requireText(charter, 'one authenticated product owner', 'single-human charter');
requireText(charter, 'AI is a system capability, not a second human participant and not an independent authority', 'AI authority boundary');
requireText(requirements, 'WF-AI-002', 'AI self-approval prohibition');
requireText(delivery, 'collaborator membership/administration', 'removed collaboration scope record');
requireText(packageJson, '"seed:single-user-local": "WAYFOUND_LOCAL_TEST=1 node scripts/seed-single-user-local.mjs"', 'single-user seed command');
requireText(singleUserSeed, 'backend.admin.auth.admin.deleteUser(user.id)', 'single-user seed removes other local users');
requireText(singleUserSeed, 'backend.admin.auth.admin.updateUserById(retained.id', 'single-user seed refreshes retained owner');
requireText(singleUserSeed, 'backend.admin.auth.admin.createUser', 'single-user seed creates owner when absent');
requireText(localBackend, "process.env.WAYFOUND_LOCAL_TEST !== '1'", 'explicit seed local-test guard');
requireText(localBackend, "['127.0.0.1','localhost']", 'seed loopback-only guard');
requireText(localDevelopment, 'WAYFOUND_SINGLE_USER_AUTO_SIGN_IN=true', 'no-login local-development instructions');
requireText(noLoginSpec, 'without asking the sole user to enter credentials', 'no-login product outcome');
requireText(noLoginSpec, 'must continue to use the publishable/anon key and authenticated user session', 'RLS-preserving no-login contract');
requireText(adr6, 'will not require interactive login', 'accepted no-login decision');
requireText(adr6, 'RLS enforcement, actor attribution, audit history', 'identity preservation decision');

console.log('PASS: single-user mode keeps one authenticated owner and explicit AI boundaries, hides deferred human collaboration, supports loopback-only one-account seeding, and can remove interactive login through a separately guarded local automatic owner session without bypassing RLS.');
