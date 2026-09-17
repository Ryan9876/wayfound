'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  advanceInterview,
  createInitialState,
  getApplicableQuestions,
  getNextQuestion,
  getProgress,
  getResolvedQuestion,
  getSummary,
  goBackInterview,
  isInterviewComplete,
  reviewInterview,
  selectAnswer,
  type InterviewState,
} from '@/shared/interview-model.js';

type DurableAnswer = {
  questionKey: string;
  optionKey: string;
  revisionId: string;
  revisionNumber: number;
};

type Snapshot = {
  projectId: string;
  title: string;
  startingIdea: string;
  version: number;
  answers: DurableAnswer[];
  complete: boolean;
  progress: { answered: number; total: number; percent: number };
};

function reconstruct(snapshot: Snapshot): InterviewState {
  const answers = Object.fromEntries(snapshot.answers.map((answer) => [answer.questionKey, answer.optionKey]));
  const base = { ...createInitialState(), idea: snapshot.startingIdea, started: true, answers };
  const applicable = getApplicableQuestions(base);
  if (isInterviewComplete(base)) {
    return { ...base, complete: true, currentQuestionId: null, history: applicable.map((question) => question.id) };
  }
  const next = getNextQuestion(base);
  const nextIndex = next ? applicable.findIndex((question) => question.id === next.id) : -1;
  const history = (nextIndex >= 0 ? applicable.slice(0, nextIndex) : applicable)
    .filter((question) => Boolean(answers[question.id]))
    .map((question) => question.id);
  return { ...base, complete: false, currentQuestionId: next?.id ?? null, history };
}

export function DurableInterview({ projectId }: { projectId: string }): React.ReactNode {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [state, setState] = useState<InterviewState | null>(null);
  const [message, setMessage] = useState('Loading your saved Interview…');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/projects/${projectId}/interview`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Wayfound could not load this Interview.');
      return;
    }
    const nextSnapshot = payload.interview as Snapshot;
    setSnapshot(nextSnapshot);
    setState(reconstruct(nextSnapshot));
    setMessage('');
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const question = useMemo(() => {
    if (!state?.currentQuestionId) return null;
    return getResolvedQuestion(state, state.currentQuestionId);
  }, [state]);

  const progress = state ? getProgress(state) : { answered: 0, total: 0, percent: 0 };

  async function saveAndContinue(): Promise<void> {
    if (!snapshot || !state || !question) return;
    const optionKey = state.answers[question.id];
    if (!optionKey) {
      setMessage('Pick an answer first. Wayfound is patient, but not psychic.');
      return;
    }
    setSaving(true);
    setMessage('Saving locally…');
    const response = await fetch(`/api/v1/projects/${projectId}/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        expectedVersion: snapshot.version,
        questionKey: question.id,
        optionKey,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setSaving(false);
      if (response.status === 409) {
        setMessage('This project changed somewhere else. Reloaded the newer version instead of overwriting it.');
        await load();
        return;
      }
      setMessage(payload?.error?.message ?? 'Wayfound could not save that choice.');
      return;
    }

    setSnapshot({
      ...snapshot,
      version: payload.projectVersion,
      answers: [
        ...snapshot.answers.filter((answer) => answer.questionKey !== question.id),
        {
          questionKey: question.id,
          optionKey,
          revisionId: payload.answerRevisionId,
          revisionNumber: (snapshot.answers.find((answer) => answer.questionKey === question.id)?.revisionNumber ?? 0) + 1,
        },
      ],
      complete: Boolean(payload.complete),
      progress,
    });
    setState(advanceInterview(state));
    setSaving(false);
    setMessage(optionKey === 'not-sure' ? 'Saved as something to decide later.' : 'Saved locally.');
  }

  if (!snapshot || !state) {
    return <main className="shell"><section className="card"><p>{message}</p></section></main>;
  }

  if (state.complete) {
    const summary = getSummary(state);
    return (
      <main className="shell">
        <header className="topbar">
          <div><strong>{snapshot.title}</strong><span className="muted">Saved locally · Project version {snapshot.version}</span></div>
          <Link href="/projects">Projects</Link>
        </header>
        <section className="card interview-complete">
          <p className="eyebrow">FIRST DEFINITION PASS COMPLETE</p>
          <h1>You have enough shape to keep moving.</h1>
          <p className="muted">The answers below are current durable Interview choices. They can still change; revisions stay in history.</p>
          <div className="summary-list">
            {summary.decisions.map((decision) => (
              <div className="summary-row" key={decision.id}><strong>{decision.label}</strong><span>{decision.value}</span></div>
            ))}
          </div>
          <div className="actions">
            <button className="button primary" type="button" onClick={() => { setState(reviewInterview(state)); setMessage(''); }}>Review choices</button>
            <Link className="button" href="/projects">Back to projects</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="shell">
        <section className="card">
          <h1>Wayfound lost its place for a moment.</h1>
          <p className="muted">Your saved answers are still local. Reload the Interview to reconstruct the current step.</p>
          <div className="actions">
            <button className="button primary" type="button" onClick={() => void load()}>Reload Interview</button>
            <Link className="button" href="/projects">Back to projects</Link>
          </div>
        </section>
      </main>
    );
  }

  const selected = state.answers[question.id] ?? '';
  return (
    <main className="shell">
      <header className="topbar">
        <div><strong>{snapshot.title}</strong><span className="muted">Saved locally · Project version {snapshot.version}</span></div>
        <Link href="/projects">Projects</Link>
      </header>

      <section className="card interview-context">
        <p className="eyebrow">STARTING IDEA</p>
        <p>{snapshot.startingIdea}</p>
        <div className="progress-row" aria-label={`Interview progress ${progress.answered} of ${progress.total}`}>
          <div className="progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
          <span className="muted">{progress.answered} of {progress.total} useful decisions</span>
        </div>
      </section>

      <section className="card interview-question">
        <p className="eyebrow">{question.stage}</p>
        <h1>{question.prompt}</h1>
        <p className="muted">{question.help}</p>
        <div className="why-box"><strong>Why Wayfound is asking</strong><span>{question.why}</span></div>

        {question.recommendation ? (
          <div className="recommendation-box">
            <strong>Recommended starting point</strong>
            <span>{question.options.find((option) => option.id === question.recommendation?.optionId)?.label}</span>
            <small>{question.recommendation.reason}</small>
          </div>
        ) : null}

        <fieldset className="choice-list">
          <legend className="sr-only">Choose an answer</legend>
          {question.options.map((option) => (
            <label className={`choice-card ${selected === option.id ? 'selected' : ''}`} key={option.id}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={selected === option.id}
                onChange={() => setState(selectAnswer(state, question.id, option.id))}
              />
              <span className="choice-copy">
                <strong>{option.label}{option.recommended ? <em>Recommended</em> : null}</strong>
                <span>{option.detail}</span>
                <small><b>Tradeoff:</b> {option.tradeoff}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="actions interview-actions">
          <button className="button" type="button" disabled={state.history.length === 0} onClick={() => setState(goBackInterview(state))}>Back</button>
          <button className="button primary" type="button" disabled={saving || !selected} onClick={() => void saveAndContinue()}>
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
          <span className="muted" role="status">{message}</span>
        </div>
      </section>
    </main>
  );
}
