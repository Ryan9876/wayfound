'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import type { ProjectSummary } from '@/server/persistence/project-store';

export function ProjectWorkspace({ initialProjects }: { initialProjects: ProjectSummary[] }): React.ReactNode {
  const [projects] = useState(initialProjects);
  const [message, setMessage] = useState('');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Saving…');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ title: form.get('title'), startingIdea: form.get('startingIdea') }),
    });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload?.error?.message ?? 'Wayfound could not save the project.'); return; }
    window.location.href = `/projects/${payload.projectId}`;
  }

  return (
    <main className="shell">
      <header className="topbar"><div><strong>Wayfound</strong><span className="muted">Projects</span></div><Link href="/">Home</Link></header>
      <section className="split">
        <form className="card" onSubmit={create}>
          <p className="eyebrow">NEW PROJECT</p><h1>What are you making?</h1>
          <label>Project name<input name="title" maxLength={120} required placeholder="Tiny Planet Puzzle" /></label>
          <label>Starting idea<textarea name="startingIdea" maxLength={8000} required placeholder="I want to make…" /></label>
          <button className="button primary" type="submit">Create project</button><span className="muted">{message}</span>
        </form>
        <section className="card"><p className="eyebrow">SAVED PROJECTS</p><h2>Pick up where you left off</h2>{projects.length ? <ul className="project-list">{projects.map((project) => <li key={project.id}><Link href={`/projects/${project.id}`}><strong>{project.title}</strong><span>{project.startingIdea}</span></Link></li>)}</ul> : <p>No saved projects yet. A very clean desk.</p>}</section>
      </section>
    </main>
  );
}
