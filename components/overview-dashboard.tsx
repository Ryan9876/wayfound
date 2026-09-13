import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Lightbulb,
  ShieldCheck,
  Users,
} from "lucide-react";
import { demoRelease } from "@/lib/demo-data";

const phases = [
  { label: "Understand", state: "done" },
  { label: "Validate & Compare", state: "active" },
  { label: "Define", state: "upcoming" },
  { label: "Build", state: "upcoming" },
  { label: "Launch", state: "upcoming" },
];

export function OverviewDashboard() {
  return (
    <section className="overview" aria-labelledby="release-title">
      <div className="release-heading">
        <div>
          <span className="eyebrow">Release</span>
          <h1 id="release-title">{demoRelease.project} <span>•</span> {demoRelease.release}</h1>
          <p>{demoRelease.subtitle}</p>
        </div>
        <div className="stage-block">
          <span className="stage-pill"><i />Stage {demoRelease.stage}: {demoRelease.stageName}</span>
          <div className="phase-track" aria-label="Release progress">
            {phases.map((phase, index) => (
              <div className={`phase-step ${phase.state}`} key={phase.label}>
                <span className="phase-marker">{phase.state === "done" ? <Check size={12} /> : index + 1}</span>
                <small>{phase.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="next-action-card">
          <div className="card-topline">
            <span className="eyebrow">Next action</span>
            <span className="pager"><b>1 of 5</b><button aria-label="Previous action"><ChevronLeft size={16} /></button><button aria-label="Next action"><ChevronRight size={16} /></button></span>
          </div>
          <div className="action-intro">
            <span className="round-icon"><Binoculars size={22} strokeWidth={1.7} /></span>
            <div>
              <h2>{demoRelease.nextAction.title}</h2>
              <p>{demoRelease.nextAction.description}</p>
            </div>
          </div>
          <div className="why-panel">
            <span className="eyebrow">Why this matters</span>
            <div className="minto-line"><b>So what?</b><span>{demoRelease.nextAction.soWhat}</span></div>
            <div className="minto-line"><b>Because…</b><span>{demoRelease.nextAction.because}</span></div>
            <div className="minto-line"><b>And…</b><span>{demoRelease.nextAction.and}</span></div>
          </div>
          <div className="action-buttons">
            <button className="button primary" type="button">Start next action <ArrowRight size={17} /></button>
            <button className="button secondary" type="button"><FileText size={16} /> View action details</button>
          </div>
        </article>

        <aside className="context-card">
          <div className="card-heading"><span className="eyebrow">Context</span><Link href="/records">View records</Link></div>
          <dl className="context-list">
            <div><dt><Users size={17} /> Who experiences this?</dt><dd>Workshop volunteers handling equipment loans.</dd></div>
            <div><dt><Lightbulb size={17} /> Working assumption</dt><dd>Staff enter each checkout; borrowers do not need accounts in this release.</dd></div>
            <div><dt><ShieldCheck size={17} /> Evidence state</dt><dd><span className="status-chip pending"><Circle size={8} fill="currentColor" /> Direct observation pending</span></dd></div>
          </dl>
          <div className="context-footer">
            <span><small>Owner</small><strong>Jordan Singh</strong></span>
            <span><small>Reviewer</small><strong>Not assigned</strong></span>
          </div>
        </aside>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <div className="card-heading"><span className="eyebrow">What we know</span><span className="count-badge">3</span></div>
          <ul className="clean-list check-list">
            <li><Check size={15} /> Loan records are incomplete today.</li>
            <li><Check size={15} /> Volunteers perform checkout and return.</li>
            <li><Check size={15} /> Clear availability is the first problem to solve.</li>
          </ul>
        </article>
        <article className="summary-card">
          <div className="card-heading"><span className="eyebrow">Open assumptions</span><span className="count-badge amber">2</span></div>
          <ul className="clean-list dot-list">
            <li><i /> A configured existing tool may still meet the essential workflow.</li>
            <li><i /> Borrowers do not need self-service in Release 1.0.</li>
          </ul>
        </article>
        <article className="summary-card release-card">
          <div className="card-heading"><span className="eyebrow">This release</span><Link href="/journey">Open journey</Link></div>
          <div className="release-stat"><strong>1</strong><span>stage complete</span></div>
          <div className="mini-progress"><span /></div>
          <p>1 of 15 stages has completed evidence. Stage 2 is active.</p>
        </article>
      </div>

      <article className="records-strip">
        <div><span className="eyebrow">Recent records</span><h3>Project continuity, in one place.</h3></div>
        <div className="record-items">
          <span><i className="record-dot accepted" /><b>Problem brief</b><small>Accepted • v1</small></span>
          <span><i className="record-dot proposed" /><b>Observation plan</b><small>Proposed • v1</small></span>
          <span><i className="record-dot neutral" /><b>Alternative comparison</b><small>Not started</small></span>
        </div>
        <Link className="text-link" href="/records">All records <ArrowRight size={15} /></Link>
      </article>
    </section>
  );
}
