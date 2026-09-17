'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Project = {
  id: string; title: string; startingIdea: string; version: number;
  records: Array<{ revisionId: string; key: string; title: string; statement: string }>;
  artifacts: Array<{ revisionId: string; key: string; state: string; title: string; statement: string }>;
};

export function ProjectCheckpoint({ projectId }: { projectId: string }): React.ReactNode {
  const [project, setProject] = useState<Project | null>(null);
  const [message, setMessage] = useState('Loading…');

  async function reload() {
    const response = await fetch(`/api/v1/projects/${projectId}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload?.error?.message ?? 'Could not load the project.'); return; }
    setProject(payload.project); setMessage('');
  }
  useEffect(() => { void reload(); }, [projectId]);

  async function saveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!project) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/projects/${projectId}/answers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ expectedVersion: project.version, questionKey: form.get('questionKey'), optionKey: form.get('optionKey'), recordTitle: form.get('recordTitle'), recordStatement: form.get('recordStatement') }),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload?.error?.message ?? 'Could not save the decision.'); return; }
    setMessage(`Saved ${payload.recordKey}.`); await reload();
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!project) return;
    const source = project.records.at(-1);
    if (!source) { setMessage('Save a decision first so the proposal has a source.'); return; }
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/projects/${projectId}/artifacts/propose`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ expectedVersion: project.version, artifactKey: form.get('artifactKey'), kind: 'requirement', title: form.get('title'), statement: form.get('statement'), sourceRecordRevisionIds: [source.revisionId] }),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload?.error?.message ?? 'Could not propose the requirement.'); return; }
    setMessage('Proposed. Still not approved — important little distinction.'); await reload();
  }

  if (!project) return <main className="shell"><section className="card"><p>{message}</p></section></main>;
  return (
    <main className="shell">
      <header className="topbar"><div><strong>{project.title}</strong><span className="muted">Project version {project.version}</span></div><Link href="/projects">Projects</Link></header>
      <section className="card"><p className="eyebrow">STARTING IDEA</p><p>{project.startingIdea}</p><p className="muted">{message}</p></section>
      <section className="split">
        <form className="card" onSubmit={saveDecision}><p className="eyebrow">1 · SAVE A DECISION</p><h2>Give Wayfound one accepted answer</h2><label>Decision area<input name="questionKey" defaultValue="outcome" required /></label><label>Chosen answer<input name="optionKey" defaultValue="good-answer-faster" required /></label><label>Record title<input name="recordTitle" defaultValue="Primary outcome" required /></label><label>What it means<textarea name="recordStatement" defaultValue="Help people reach a good answer faster." required /></label><button className="button primary">Save decision</button></form>
        <form className="card" onSubmit={propose}><p className="eyebrow">2 · PROPOSE SOMETHING</p><h2>Turn the latest record into a proposal</h2><label>Requirement key<input name="artifactKey" defaultValue="decision-speed" required /></label><label>Title<input name="title" defaultValue="Support faster decisions" required /></label><label>Requirement<textarea name="statement" defaultValue="The product must help the user reach a useful decision without hiding important evidence." required /></label><button className="button primary">Propose requirement</button><p className="muted">Proposal saves an exact revision and source link. M2 has no Approve button.</p></form>
      </section>
      <section className="split"><section className="card"><h2>Current records</h2><ul className="project-list">{project.records.map((record) => <li key={record.revisionId}><strong>{record.key}</strong><span>{record.statement}</span></li>)}</ul></section><section className="card"><h2>Materialized artifacts</h2><ul className="project-list">{project.artifacts.map((artifact) => <li key={artifact.revisionId}><strong>{artifact.key} · {artifact.state}</strong><span>{artifact.statement}</span></li>)}</ul></section></section>
    </main>
  );
}
