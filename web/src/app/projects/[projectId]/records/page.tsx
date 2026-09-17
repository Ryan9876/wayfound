import Link from 'next/link';
import { requireActor } from '@/server/auth/actor';
import { getDurableRecords } from '@/server/records/durable-records';

const TYPE_LABELS = {
  decision: 'Decision',
  assumption: 'Guess to verify',
  blocker: 'Blocker',
  'open-question': 'Open question',
} as const;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function RecordsPage({ params }: { params: Promise<{ projectId: string }> }): Promise<React.ReactNode> {
  const { projectId } = await params;
  const actor = await requireActor();
  const snapshot = await getDurableRecords(actor.actorId, projectId);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <strong>{snapshot.title}</strong>
          <span className="muted">Records · Project version {snapshot.version}</span>
        </div>
        <nav className="topbar-links" aria-label="Project navigation">
          <Link href={`/projects/${projectId}`}>Interview</Link>
          <Link href="/projects">Projects</Link>
        </nav>
      </header>

      <section className="card records-intro">
        <p className="eyebrow">CURRENT RECORDS</p>
        <h1>What Wayfound currently understands</h1>
        <p className="muted">
          Records are rebuilt from the current saved Interview state. Saved choices carry exact revision evidence; derived items stay projections instead of quietly becoming a second truth.
        </p>
      </section>

      <section className="record-counts" aria-label="Record counts">
        <div className="record-count"><strong>{snapshot.counts.decisions}</strong><span>Decisions</span></div>
        <div className="record-count"><strong>{snapshot.counts.assumptions}</strong><span>Guesses to verify</span></div>
        <div className="record-count"><strong>{snapshot.counts.blockers}</strong><span>Blockers</span></div>
        <div className="record-count"><strong>{snapshot.counts.openQuestions}</strong><span>Open questions</span></div>
      </section>

      {snapshot.records.length === 0 ? (
        <section className="card records-empty">
          <h2>No Records yet</h2>
          <p className="muted">Answer the first Interview question and Wayfound will have something worth remembering.</p>
          <Link className="button primary" href={`/projects/${projectId}`}>Continue Interview</Link>
        </section>
      ) : (
        <section className="records-list">
          {snapshot.records.map((record) => (
            <article className="card record-card" key={record.id}>
              <div className="record-heading">
                <div>
                  <span className={`record-type ${record.type}`}>{TYPE_LABELS[record.type]}</span>
                  <code>{record.id}</code>
                </div>
                <span className="muted">{record.status}</span>
              </div>
              <h2>{record.title}</h2>
              <p className="record-statement">{record.statement}</p>
              {record.detail ? <p className="muted">{record.detail}</p> : null}
              <p className="muted">Source: {record.source}</p>

              {record.evidence.kind === 'saved' ? (
                <details className="record-evidence">
                  <summary>Backed by saved Interview revisions</summary>
                  <dl>
                    <div><dt>Answer revision</dt><dd><code>{record.evidence.answerRevisionId}</code></dd></div>
                    <div><dt>Record revision</dt><dd><code>{record.evidence.recordRevisionId}</code></dd></div>
                  </dl>
                </details>
              ) : (
                <p className="record-evidence derived">Derived from current Interview state — not separately stored as project truth.</p>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
