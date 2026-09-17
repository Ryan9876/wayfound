import Link from 'next/link';
import { AuthControls } from '@/components/AuthControls';

export default function HomePage(): React.ReactNode {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <main className="shell">
      <header className="topbar"><div><strong>Wayfound</strong><span className="muted">Production foundation</span></div>{clerkConfigured ? <AuthControls /> : null}</header>
      <section className="hero card">
        <p className="eyebrow">M2 · DURABLE PROJECT SLICE</p>
        <h1>Keep the helpful part. Add a real memory.</h1>
        <p>Wayfound is moving from a browser-only prototype to durable, traceable project state. The server—not the page—decides what becomes project truth.</p>
        <div className="actions"><Link className="button primary" href="/projects">Open projects</Link></div>
      </section>
      {!clerkConfigured ? <section className="notice card"><strong>Setup needed before sign-in works</strong><p>Add Clerk and database environment values from <code>.env.example</code>. No secret belongs in Git.</p></section> : null}
      <section className="grid">
        <article className="card"><span className="number">1</span><h2>Identity</h2><p>Clerk proves who signed in. Wayfound maps that identity to its own Actor.</p></article>
        <article className="card"><span className="number">2</span><h2>Authority</h2><p>Project writes go through server commands with permission and version checks.</p></article>
        <article className="card"><span className="number">3</span><h2>Traceability</h2><p>Answers, records, proposals, revisions, and links remain distinguishable.</p></article>
      </section>
    </main>
  );
}
