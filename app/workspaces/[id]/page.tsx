import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { CreateDecisionForm, CreateWorkItemForm, CreateRequirementForm, CreateEvidenceForm } from "@/components/workspace-forms";
import { workspaceService } from "@/lib/application/workspaces";
import { decisionService } from "@/lib/application/decisions";
import { workItemService } from "@/lib/application/work-items";
import { requirementService } from "@/lib/application/requirements";
import { evidenceService } from "@/lib/application/evidence";
import { stageCatalog } from "@/lib/domain/journey";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await (await workspaceService()).open(id);
  if (!workspace) notFound();

  const decisions = await (await decisionService()).list(id);
  const workItems = await (await workItemService()).list(id);
  const requirements = await (await requirementService()).list(id);
  const evidence = await (await evidenceService()).list(id);
  const current = stageCatalog.find(stage => stage.number === workspace.release.current_stage)!;

  return <WorkspaceFrame signedIn>
    <div className="durable-heading">
      <span className="eyebrow">Saved workspace · Revision {workspace.revision}</span>
      <h1>{workspace.name}</h1>
      <p>{workspace.release.label} <span className="status-chip">{workspace.release.lifecycle}</span></p>
      <span className="stage-pill">Stage {current.number}: {current.name}</span>
    </div>
    <div className="workspace-columns">
      <section>
        <article className="durable-card durable-next">
          <span className="eyebrow">Next action · Guidance</span>
          <h2>Clarify who experiences this problem.</h2>
          <p>Describe one situation in which the problem occurs and the outcome that would improve it.</p>
          <div className="entry-note"><strong>Why this matters</strong><p>A clear problem gives the project a useful starting point. Requirements, acceptance criteria, and evidence remain distinct project records.</p></div>
        </article>
        <article className="durable-card problem-record">
          <span className="eyebrow">Your problem statement</span>
          <p>{workspace.problem_statement}</p>
          <span className="form-help">Recorded at workspace creation. This statement is not verification evidence.</span>
        </article>

        <section id="decisions" className="decision-section" aria-labelledby="decisions-title">
          <div className="decision-section-header"><div><span className="eyebrow">Project record</span><h2 id="decisions-title">Decisions</h2><p>These are accepted product-scope or business choices made under product-owner authority.</p></div><span className="status-chip">{decisions.length} accepted</span></div>
          {decisions.length ? <div className="decision-list">{decisions.map(decision => <article className="durable-card decision-card" key={decision.id}><span className="eyebrow">Accepted decision</span><h3>{decision.title}</h3><p>{decision.decision}</p><div className="entry-note"><strong>Rationale</strong><p>{decision.rationale}</p></div><div className="decision-meta"><span><strong>Status:</strong> {decision.status}</span><span><strong>Authority:</strong> Product owner</span><span><strong>Stage:</strong> {decision.stage_number} · {stageCatalog[decision.stage_number - 1].name}</span><span><strong>Revision:</strong> {decision.revision}</span></div></article>)}</div> : <article className="durable-card"><h3>No accepted decisions yet.</h3><p>Record a product-scope or business choice when you are ready to make it part of project direction.</p></article>}
          <article className="durable-card decision-form-card"><span className="eyebrow">Product-owner authority</span><h3>Record an accepted decision</h3><p>Use this only for a product-scope or business decision you are authorized to approve. Consequential technical decisions require qualified specialist review.</p><CreateDecisionForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <section id="work-items" className="work-item-section" aria-labelledby="work-items-title">
          <div className="work-item-section-header"><div><span className="eyebrow">Project record</span><h2 id="work-items-title">Work</h2><p>Bounded proposed work with an explicit owner, outcome, completion condition, and expected evidence.</p></div><span className="status-chip">{workItems.length} proposed</span></div>
          {workItems.length ? <div className="work-item-list">{workItems.map(item => <article className="durable-card work-item-card" key={item.id}><span className="eyebrow">Proposed work item</span><h3>{item.title}</h3><p>{item.outcome}</p><div className="work-item-detail"><strong>Complete when</strong><p>{item.completion_condition}</p></div><div className="work-item-detail"><strong>Evidence expected</strong><p>{item.evidence_expectation}</p></div><div className="work-item-meta"><span><strong>Status:</strong> {item.status}</span><span><strong>Owner:</strong> Product owner</span><span><strong>Stage:</strong> {item.stage_number} · {stageCatalog[item.stage_number - 1].name}</span><span><strong>Revision:</strong> {item.revision}</span></div></article>)}</div> : <article className="durable-card"><h3>No proposed work yet.</h3><p>Add a bounded work item when you can state its outcome and completion condition clearly.</p></article>}
          <article className="durable-card work-item-form-card"><span className="eyebrow">Owner-planned work</span><h3>Add proposed work</h3><p>This records planned work only. It does not start execution, assign a specialist, or claim implementation or verification.</p><CreateWorkItemForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <section id="requirements" className="requirement-section" aria-labelledby="requirements-title">
          <div className="requirement-section-header"><div><span className="eyebrow">Project record</span><h2 id="requirements-title">Requirements</h2><p>Approved product behavior with stable requirement, criterion, and evidence links.</p></div><span className="status-chip">{requirements.length} approved</span></div>
          {requirements.length ? <div className="requirement-list">{requirements.map(requirement => <article className="durable-card requirement-card" key={requirement.id}>
            <span className="eyebrow">Approved product requirement</span>
            <h3>{requirement.title}</h3>
            <p className="requirement-statement"><strong>{requirement.obligation}</strong><span>{requirement.requirement}</span></p>
            {requirement.acceptance_criteria.map(criterion => {
              const criterionEvidence = evidence.filter(item => item.acceptance_criterion_id === criterion.id);
              return <div className="requirement-criterion" id={`criterion-${criterion.id}`} key={criterion.id}>
                <div className="criterion-heading"><div><strong>Acceptance criterion · Not verification evidence</strong><p>{criterion.statement}</p></div><span className="status-chip">{criterionEvidence.length} evidence</span></div>
                <code>Criterion ID: {criterion.id}</code>
                <div className="criterion-evidence" aria-label={`Evidence for criterion ${criterion.id}`}>
                  <div className="evidence-heading"><div><span className="eyebrow">Linked evidence</span><h4>Recorded results</h4></div></div>
                  {criterionEvidence.length ? <div className="evidence-list">{criterionEvidence.map(item => <article className="evidence-card" key={item.id}>
                    <span className="evidence-effect"><strong>Effect:</strong> {item.effect}</span>
                    <h4>{item.title}</h4>
                    <div className="evidence-detail"><strong>Result</strong><p>{item.result}</p></div>
                    <div className="evidence-detail"><strong>Source / provenance</strong><p>{item.source_note}</p></div>
                    <div className="evidence-meta"><span><strong>Recorder:</strong> Product owner</span><span><strong>Requirement revision:</strong> {item.requirement_revision}</span><span><strong>Criterion revision:</strong> {item.criterion_revision}</span><span><strong>Stage:</strong> {item.stage_number} · {stageCatalog[item.stage_number - 1].name}</span></div>
                    <code>Evidence ID: {item.id}</code>
                    <p className="evidence-warning"><strong>Verification state unchanged.</strong> This recorded evidence does not by itself verify or satisfy the acceptance criterion.</p>
                  </article>)}</div> : <p className="evidence-empty">No evidence recorded for this criterion.</p>}
                  <div className="evidence-form-card"><span className="eyebrow">Record a result</span><h4>Add evidence for this criterion</h4><p>Record what happened and where the result came from. Choose how the result relates to the criterion without making a verification decision.</p><CreateEvidenceForm workspaceId={workspace.id} acceptanceCriterionId={criterion.id} requestId={randomUUID()} /></div>
                </div>
              </div>;
            })}
            <div className="requirement-meta"><span><strong>Status:</strong> {requirement.status}</span><span><strong>Authority:</strong> Product owner</span><span><strong>Stage:</strong> {requirement.stage_number} · {stageCatalog[requirement.stage_number - 1].name}</span><span><strong>Revision:</strong> {requirement.revision}</span></div>
            <code className="requirement-id">Requirement ID: {requirement.id}</code>
          </article>)}</div> : <article className="durable-card"><h3>No approved requirements yet.</h3><p>Record product behavior only when you are ready to approve it as project direction.</p></article>}
          <article className="durable-card requirement-form-card"><span className="eyebrow">Product-owner authority</span><h3>Record an approved product requirement</h3><p>Use this for product or business behavior within your authority. Consequential technical implementation choices still require qualified specialist review.</p><CreateRequirementForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>
      </section>

      <aside className="durable-card">
        <span className="eyebrow">Journey</span>
        <h2>A map, not a gate.</h2>
        <ol className="durable-journey">{workspace.stages.map(stage => <li key={stage.stage_number} aria-current={stage.stage_number === current.number ? "step" : undefined}><span className="journey-number">{stage.stage_number}</span><span>{stageCatalog[stage.stage_number - 1].name}<small>{({ active: "Current stage", upcoming: "Upcoming", complete: "Complete", reopened: "Reopened", blocked: "Blocked" } as Record<string, string>)[stage.state]}</small></span></li>)}</ol>
      </aside>
    </div>
  </WorkspaceFrame>;
}
