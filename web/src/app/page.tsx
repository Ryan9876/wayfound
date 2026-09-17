import Link from 'next/link';
import { AuthControls } from '@/components/AuthControls';
import { identityMode } from '@/server/auth/actor';
import { persistenceMode } from '@/server/persistence/store';
import { resolveAiProvider } from '@/server/ai/provider';

export default function HomePage(): React.ReactNode {
  const identity = identityMode();
  const persistence = persistenceMode();
  const ai = resolveAiProvider();
  const clerkConfigured = identity === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="shell">
      <header className="topbar"><div><strong>Wayfound</strong><span className="muted">Local-first foundation</span></div>{clerkConfigured ? <AuthControls /> : null}</header>
      <section className="hero card">
        <p className="eyebrow">M2 · LOCAL DURABLE PROJECT</p>
        <h1>Your project stays here unless you choose otherwise.</h1>
        <p>Wayfound runs with a local human Actor and local SQLite project store by default. Cloud identity, hosted databases, and external AI providers are optional adapters—not prerequisites.</p>
        <div className="actions"><Link className="button primary" href="/projects">Open projects</Link></div>
      </section>
      <section className="grid">
        <article className="card"><span className="number">1</span><h2>Local identity</h2><p>{identity === 'local' ? 'No sign-in required. This installation owns its local projects.' : 'Hosted Clerk identity is explicitly enabled.'}</p></article>
        <article className="card"><span className="number">2</span><h2>Local project memory</h2><p>{persistence === 'local' ? 'SQLite keeps project revisions, records, trace links, and proposals on this computer.' : 'PostgreSQL hosted persistence is explicitly enabled.'}</p></article>
        <article className="card"><span className="number">3</span><h2>AI is your choice</h2><p>{ai.enabled ? `${ai.provider} is configured${ai.local ? ' locally' : ' as an external provider'}.` : 'AI is off. You can enable Ollama, LM Studio, or an approved external provider later.'}</p></article>
      </section>
    </main>
  );
}
