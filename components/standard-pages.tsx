import { ArrowRight, CheckCircle2, Circle, Clock3, FileText, PackageOpen, ShieldCheck } from "lucide-react";

export function WorkView() {
  return <section className="standard-page"><PageHeading eyebrow="Work" title="Keep work bounded and owned." text="Work items connect the current stage to a clear output, owner, and completion condition." />
    <div className="list-panel">
      <WorkRow status="Next" title="Observe one equipment checkout" meta="Owner: Jordan Singh • Stage 2" action="Open action" />
      <WorkRow status="Queued" title="Compare three viable approaches" meta="Depends on: checkout observation" action="View dependency" />
      <WorkRow status="Queued" title="Record the route decision" meta="Depends on: alternatives comparison" action="View dependency" />
    </div>
  </section>;
}

function WorkRow({ status, title, meta, action }: { status: string; title: string; meta: string; action: string }) {
  return <article className="list-row"><span className={`row-status ${status.toLowerCase()}`}><Circle size={8} fill="currentColor" />{status}</span><div><h3>{title}</h3><p>{meta}</p></div><button className="text-button">{action} <ArrowRight size={15} /></button></article>;
}

export function HandoffsView() {
  return <section className="standard-page"><PageHeading eyebrow="Handoffs" title="Give specialists the context they need." text="The first version uses explicit manual packages. Returned work stays proposed until it is reconciled." />
    <div className="feature-grid two">
      <article className="feature-card prominent"><span className="round-icon"><PackageOpen size={22} /></span><span className="eyebrow">Planned handoff</span><h2>Requirements package</h2><p>Prepare accepted scope, decisions, assumptions, constraints, and relevant files for a requirements specialist or DSpec.</p><div className="feature-meta"><span><small>Stage</small><strong>7 • Define requirements</strong></span><span><small>Mode</small><strong>Manual exchange</strong></span></div><button className="button secondary" disabled>Available in a later slice</button></article>
      <article className="feature-card"><span className="eyebrow">Return rule</span><h2>Imported work does not replace accepted work.</h2><p>A returned specification becomes a proposed revision. The accepted version remains available until review is complete.</p><ul className="clean-list check-list compact"><li><CheckCircle2 size={15} /> Preserve accepted version</li><li><CheckCircle2 size={15} /> Record failed imports</li><li><CheckCircle2 size={15} /> Show a plain-English change summary</li></ul></article>
    </div>
  </section>;
}

export function RecordsView() {
  return <section className="standard-page"><PageHeading eyebrow="Records" title="Keep decisions and evidence traceable." text="This prototype shows the record model with fixture data. Persistent version history is the next data-layer increment." />
    <div className="records-table" role="table" aria-label="Project records">
      <div className="table-row table-head" role="row"><span>Record</span><span>Stage</span><span>Status</span><span>Version</span></div>
      <RecordRow name="Problem brief" stage="1 • Clarify" status="Accepted" version="v1" />
      <RecordRow name="Observation plan" stage="2 • Validate and compare" status="Proposed" version="v1" />
      <RecordRow name="Alternative comparison" stage="2 • Validate and compare" status="Not started" version="—" />
      <RecordRow name="Route decision" stage="2 • Validate and compare" status="Not started" version="—" />
    </div>
  </section>;
}
function RecordRow({name,stage,status,version}:{name:string;stage:string;status:string;version:string}) {return <div className="table-row" role="row"><span><FileText size={16} />{name}</span><span>{stage}</span><span><i className={`record-dot ${status === "Accepted" ? "accepted" : status === "Proposed" ? "proposed" : "neutral"}`} />{status}</span><span className="mono">{version}</span></div>}

export function ReleaseCareView() {
  return <section className="standard-page"><PageHeading eyebrow="Release & Care" title="Release only what the evidence supports." text="Readiness is separate from implementation. This prototype does not claim release readiness." />
    <div className="readiness-banner"><ShieldCheck size={22} /><div><strong>Release readiness is not yet applicable.</strong><p>Borrow Desk is in Stage 2. No implementation, verification, deployment, or support evidence exists in this illustrative project.</p></div></div>
    <div className="readiness-grid">
      {["Functionality","Usability","Accessibility","Security","Recovery","Support ownership"].map(item => <article className="readiness-card" key={item}><span><Clock3 size={16} />Pending</span><h3>{item}</h3><p>Required evidence will appear here when this check becomes applicable.</p></article>)}
    </div>
  </section>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div></div> }
