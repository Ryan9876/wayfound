import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Clock3, FileText, PackageOpen, ShieldCheck } from "lucide-react";

export function WorkView() {
  return <section className="standard-page work-page"><PageHeading eyebrow="Work" title="Keep work bounded and owned." text="Work items connect the current stage to a clear output, owner, and completion condition." />
    <article className="work-focus-card">
      <div className="work-focus-topline">
        <span className="eyebrow">Current focus</span>
        <span className="row-status next"><Circle size={8} fill="currentColor" />Next</span>
      </div>
      <div className="work-focus-copy">
        <h2>Observe one equipment checkout</h2>
        <p>Watch a real checkout to see how the process works in practice, what confuses people, and where it slows down.</p>
      </div>
      <div className="work-focus-meta">
        <span><small>Owner</small><strong>Jordan Singh</strong></span>
        <span><small>Stage</small><strong>2 • Validate and compare</strong></span>
        <span><small>Complete when</small><strong>One real checkout is observed and findings are recorded.</strong></span>
        <span><small>Evidence expected</small><strong>Observation notes linked to the Stage 2 record.</strong></span>
      </div>
      <button className="button primary work-primary-action" type="button">Start action <ArrowRight size={16} /></button>
    </article>

    <div className="work-queue-heading">
      <div><span className="eyebrow">Queued next</span><h2>Dependent work</h2></div>
      <span>2 actions</span>
    </div>
    <div className="list-panel work-queue">
      <WorkRow status="Queued" title="Compare three viable approaches" meta="Depends on: checkout observation" action="View dependency" />
      <WorkRow status="Queued" title="Record the route decision" meta="Depends on: alternatives comparison" action="View dependency" />
    </div>
  </section>;
}

function WorkRow({ status, title, meta, action }: { status: string; title: string; meta: string; action: string }) {
  return <article className="list-row"><span className={`row-status ${status.toLowerCase()}`}><Circle size={8} fill="currentColor" />{status}</span><div><h3>{title}</h3><p>{meta}</p></div><button className="text-button">{action} <ArrowRight size={15} /></button></article>;
}

export function HandoffsView() {
  return <section className="standard-page handoffs-page"><PageHeading eyebrow="Handoffs" title="Give specialists the context they need." text="The first version uses explicit manual packages. Returned work stays proposed until it is reconciled." />
    <div className="handoff-state-bar">
      <div><span className="eyebrow">Current state</span><strong>No specialist handoff is active in Stage 2.</strong></div>
      <span className="row-status queued"><Circle size={8} fill="currentColor" />Stage 7 planned</span>
    </div>
    <div className="feature-grid two handoff-feature-grid">
      <article className="feature-card prominent handoff-package-card"><span className="round-icon"><PackageOpen size={22} /></span><span className="eyebrow">Planned handoff</span><h2>Requirements package</h2><p>Prepare accepted scope, decisions, assumptions, constraints, and relevant files for a requirements specialist or DSpec.</p><div className="feature-meta"><span><small>Stage</small><strong>7 • Define requirements</strong></span><span><small>Mode</small><strong>Manual exchange</strong></span></div><button className="button secondary" disabled>Available when Stage 7 work starts</button></article>
      <article className="feature-card handoff-return-card"><span className="eyebrow">Return rule</span><h2>Imported work does not replace accepted work.</h2><p>A returned specification becomes a proposed revision. The accepted version remains available until review is complete.</p><ul className="clean-list check-list compact"><li><CheckCircle2 size={15} /> Preserve accepted version</li><li><CheckCircle2 size={15} /> Record failed imports</li><li><CheckCircle2 size={15} /> Show a plain-English change summary</li></ul></article>
    </div>
    <div className="handoff-boundary-note"><strong>First-version boundary</strong><span>Handoffs use files, links, and copy-ready instructions. No direct specialist-tool connection is assumed.</span></div>
  </section>;
}

export function RecordsView() {
  return <section className="standard-page records-page"><PageHeading eyebrow="Records" title="Keep decisions and evidence traceable." text="This prototype shows the record model with fixture data. Persistent version history is the next data-layer increment." />
    <div className="records-summary" aria-label="Record status summary">
      <span><strong>4</strong><small>Total records</small></span>
      <span><strong>1</strong><small>Accepted</small></span>
      <span><strong>1</strong><small>Proposed</small></span>
      <span><strong>2</strong><small>Not started</small></span>
    </div>
    <div className="records-table" role="table" aria-label="Project records">
      <div className="table-row table-head" role="row"><span>Record</span><span>Stage</span><span>Status</span><span>Version</span></div>
      <RecordRow name="Problem brief" stage="1 • Clarify" status="Accepted" version="v1" />
      <RecordRow name="Observation plan" stage="2 • Validate and compare" status="Proposed" version="v1" />
      <RecordRow name="Alternative comparison" stage="2 • Validate and compare" status="Not started" version="—" />
      <RecordRow name="Route decision" stage="2 • Validate and compare" status="Not started" version="—" />
    </div>
  </section>;
}
function RecordRow({name,stage,status,version}:{name:string;stage:string;status:string;version:string}) {return <div className="table-row record-row" role="row"><span className="record-name"><FileText size={16} /><b>{name}</b></span><span className="record-field"><small>Stage</small>{stage}</span><span className="record-field record-status"><small>Status</small><i className={`record-dot ${status === "Accepted" ? "accepted" : status === "Proposed" ? "proposed" : "neutral"}`} />{status}</span><span className="record-field mono"><small>Version</small>{version}</span></div>}

export function MoreView() {
  return <section className="standard-page more-page"><PageHeading eyebrow="More" title="The rest of the workspace." text="Open specialist handoffs, durable records, and release care from one mobile destination." />
    <div className="more-grid">
      <Link href="/handoffs" className="more-card"><span className="more-card-icon"><PackageOpen size={21} /></span><div><span className="eyebrow">Handoffs</span><h2>Specialist packages</h2><p>Prepare bounded context and reconcile returned work.</p></div><ArrowRight size={17} /></Link>
      <Link href="/records" className="more-card"><span className="more-card-icon"><FileText size={21} /></span><div><span className="eyebrow">Records</span><h2>Project continuity</h2><p>Review decisions, evidence, status, and versions.</p></div><ArrowRight size={17} /></Link>
      <Link href="/release-care" className="more-card"><span className="more-card-icon"><ShieldCheck size={21} /></span><div><span className="eyebrow">Release & Care</span><h2>Readiness and ownership</h2><p>Track release evidence, recovery, and operating responsibility.</p></div><ArrowRight size={17} /></Link>
    </div>
  </section>;
}

export function ReleaseCareView() {
  return <section className="standard-page release-care-page"><PageHeading eyebrow="Release & Care" title="Release only what the evidence supports." text="Readiness is separate from implementation. This prototype does not claim release readiness." />
    <div className="readiness-banner"><ShieldCheck size={22} /><div><strong>Release readiness is not yet applicable.</strong><p>Borrow Desk is in Stage 2. No implementation, verification, deployment, or support evidence exists in this illustrative project.</p></div></div>
    <div className="release-state-summary" aria-label="Release readiness prerequisites">
      <span><small>Release packet</small><strong>Not started</strong></span>
      <span><small>Verification evidence</small><strong>None yet</strong></span>
      <span><small>Operations owner</small><strong>Not assigned</strong></span>
    </div>
    <div className="release-check-heading"><div><span className="eyebrow">Readiness checks</span><h2>Evidence required before release.</h2></div><span>6 checks</span></div>
    <div className="readiness-grid">
      {["Functionality","Usability","Accessibility","Security","Recovery","Support ownership"].map(item => <article className="readiness-card" key={item}><span><Clock3 size={16} />Pending</span><h3>{item}</h3><p>Required evidence will appear here when this check becomes applicable.</p></article>)}
    </div>
  </section>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div></div> }