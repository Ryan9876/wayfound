import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  Check,
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
        <div className="release-title-block">
          <span className="eyebrow">Current release</span>
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

      <div className="dashboard-grid overview-primary-grid">
        <article className="next-action-card">
          <div className="card-topline">
            <span className="eyebrow">Next action</span>
            <span className="action-position"><i />Stage {demoRelease.stage} priority</span>
          </div>
          <div className="action-intro">
            <span className="round-icon"><Binoculars size={22} strokeWidth={1.7} /></span>
            <div className="action-copy">
              <span className="action-kicker">Recommended now</span>
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

        <aside className="context-card overview-context-card">
          <div className="card-heading"><span className="eyebrow">Current context</span><Link href="/records">View records</Link></div>
          <div className="context-evidence">
            <span className="context-evidence-label"><ShieldCheck size={16} /> Evidence state</span>
            <span className="status-chip pending"><Circle size={8} fill="currentColor" /> Direct observation pending</span>
          </div>
          <dl className="context-list">
            <div><dt><Users size={17} /> Who experiences this?</dt><dd>Workshop volunteers handling equipment loans.</dd></div>
            <div><dt><Lightbulb size={17} /> Working assumption</dt><dd>Staff enter each checkout; borrowers do not need accounts in this release.</dd></div>
          </dl>
          <div className="context-footer">
            <span><small>Owner</small><strong>Jordan Singh</strong></span>
            <span><small>Reviewer</small><strong>Not assigned</strong></span>
          </div>
        </aside>
      </div>

      <div className="overview-section-heading">
        <div>
          <span className="eyebrow">Release snapshot</span>
          <h2>What is known, assumed, and complete.</h2>
        </div>
      </div>

      <div className="summary-grid overview-summary-grid">
        <article className="summary-card overview-summary-card">
          <div className="card-heading"><span className="eyebrow">What we know</span><span className="count-badge">3</span></div>
          <ul className="clean-list check-list">
            <li><Check size={15} /> Loan records are incomplete today.</li>
            <li><Check size={15} /> Volunteers perform checkout and return.</li>
            <li><Check size={15} /> Clear availability is the first problem to solve.</li>
          </ul>
        </article>
        <article className="summary-card overview-summary-card">
          <div className="card-heading"><span className="eyebrow">Open assumptions</span><span className="count-badge amber">2</span></div>
          <ul className="clean-list dot-list">
            <li><i /> A configured existing tool may still meet the essential workflow.</li>
            <li><i /> Borrowers do not need self-service in Release 1.0.</li>
          </ul>
        </article>
        <article className="summary-card release-card overview-summary-card">
          <div className="card-heading"><span className="eyebrow">This release</span><Link href="/journey">Open journey</Link></div>
          <div className="release-stat"><strong>1</strong><span>stage complete</span></div>
          <div className="mini-progress"><span /></div>
          <p>1 of 15 stages has completed evidence. Stage 2 is active.</p>
        </article>
      </div>

      <article className="records-strip overview-records-strip">
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
