import { randomUUID } from "node:crypto";
import type { TechnicalRequirementProposalRecord } from "@/lib/domain/technical-requirement";
import { stageCatalog } from "@/lib/domain/journey";
import {
  ApproveTechnicalRequirementForm,
  AssignTechnicalRequirementReviewForm,
  CreateTechnicalRequirementForm,
  ReviseTechnicalRequirementForm,
} from "@/components/technical-requirement-forms";

export function TechnicalRequirementOwnerPanel({ workspaceId, proposals }: { workspaceId: string; proposals: TechnicalRequirementProposalRecord[] }) {
  const approvedCount = proposals.filter(proposal => proposal.status === "Approved").length;
  const proposedCount = proposals.length - approvedCount;

  return <section id="technical-requirements" className="requirement-section" aria-labelledby="technical-requirements-title">
    <div className="requirement-section-header">
      <div><span className="eyebrow">Split authority</span><h2 id="technical-requirements-title">Technical requirements</h2><p>Consequential technical behavior remains Proposed until the exact requirement and acceptance criterion receive qualified review with No blocking finding and the owner separately approves that revision.</p></div>
      <span className="status-chip">{approvedCount} approved · {proposedCount} proposed</span>
    </div>

    {proposals.length ? <div className="requirement-list">{proposals.map(proposal => {
      const reviewedRevision = proposal.approval?.proposal_revision ?? proposal.revision;
      const currentAssignment = proposal.assignments.find(item => item.proposal_revision === reviewedRevision) ?? null;
      const qualifyingReview = proposal.status === "Proposed" && currentAssignment?.review?.conclusion === "No blocking finding" ? currentAssignment.review : null;
      return <article className="durable-card requirement-card" id={`technical-requirement-${proposal.id}`} key={proposal.id}>
        <span className="eyebrow">Technical requirement proposal · {proposal.status}</span>
        <h3>{proposal.title}</h3>
        <p className="requirement-statement"><strong>{proposal.obligation}</strong><span>{proposal.requirement_statement}</span></p>
        <div className="requirement-criterion"><strong>Proposed acceptance criterion · Not verification evidence</strong><p>{proposal.acceptance_criterion}</p></div>
        <div className="entry-note"><strong>Required specialist competence</strong><p>{proposal.requested_competence}</p></div>
        <div className="entry-note"><strong>Bounded review question</strong><p>{proposal.review_question}</p></div>
        <div className="requirement-meta"><span><strong>Status:</strong> {proposal.status}</span><span><strong>Proposal revision:</strong> {proposal.revision}</span><span><strong>Stage:</strong> {proposal.stage_number} · {stageCatalog[proposal.stage_number - 1].name}</span></div>
        <code>Proposal ID: {proposal.id}</code>

        {proposal.status === "Proposed" ? <>
          <p className="artifact-warning"><strong>Not an approved requirement.</strong> This proposal does not establish required project behavior, verification, validation, release readiness, or production authorization.</p>
          <ReviseTechnicalRequirementForm proposal={proposal} requestId={randomUUID()} />
          {currentAssignment ? <div className="specialist-review-record">
            <span className="eyebrow">Exact-revision specialist review · {currentAssignment.status}</span>
            <p><strong>Reviewed proposal revision:</strong> {currentAssignment.proposal_revision}</p>
            <p><strong>Reviewer actor:</strong> {currentAssignment.reviewer_actor_id}</p>
            <code>Assignment ID: {currentAssignment.id}</code>
            {currentAssignment.review ? <>
              <h4>{currentAssignment.review.conclusion}</h4>
              <p><strong>Reviewer:</strong> {currentAssignment.review.reviewer_name}</p>
              <div className="entry-note"><strong>Declared competence</strong><p>{currentAssignment.review.competence_statement}</p></div>
              <div className="entry-note"><strong>Summary</strong><p>{currentAssignment.review.summary}</p></div>
              <div className="entry-note"><strong>Findings</strong><p>{currentAssignment.review.findings}</p></div>
              <code>Review ID: {currentAssignment.review.id}</code>
              {qualifyingReview ? <div className="artifact-acceptance-action"><span className="eyebrow">Owner project-direction authority</span><h4>Approve reviewed technical requirement</h4><p>No blocking finding satisfies the qualified-review gate for this exact requirement statement and acceptance criterion. It does not itself approve the requirement.</p><ApproveTechnicalRequirementForm workspaceId={workspaceId} proposalId={proposal.id} expectedRevision={proposal.revision} requestId={randomUUID()} /></div> : <p className="artifact-warning"><strong>Approval gate not satisfied.</strong> {currentAssignment.review.conclusion === "Changes required" ? "The specialist requires changes before this revision can proceed." : "Advisory guidance does not satisfy the approval gate."}</p>}
            </> : <p className="form-help">The assigned specialist has not recorded a review yet. Owner approval is unavailable.</p>}
          </div> : <div className="artifact-acceptance-action"><span className="eyebrow">Qualified review required</span><h4>Assign this exact proposal revision</h4><p>The specialist receives the requirement statement and acceptance criterion from revision {proposal.revision}. The assignment does not create workspace membership.</p><AssignTechnicalRequirementReviewForm workspaceId={workspaceId} proposalId={proposal.id} expectedRevision={proposal.revision} requestId={randomUUID()} /></div>}
        </> : proposal.approval ? <div className="specialist-review-record">
          <span className="eyebrow">Approved technical requirement</span>
          <div className="requirement-meta"><span><strong>Status:</strong> Approved</span><span><strong>Authority:</strong> Owner after required specialist review</span><span><strong>Reviewed proposal revision:</strong> {proposal.approval.proposal_revision}</span><span><strong>Review conclusion:</strong> {proposal.approval.review_conclusion}</span><span><strong>Approved:</strong> <time dateTime={proposal.approval.approved_at}>{new Date(proposal.approval.approved_at).toISOString()}</time></span></div>
          <code>Requirement ID: {proposal.approval.requirement_id}</code><code>Criterion ID: {proposal.approval.criterion_id}</code><code>Assignment ID: {proposal.approval.assignment_id}</code><code>Review ID: {proposal.approval.review_id}</code>
          <p className="artifact-warning artifact-accepted-warning"><strong>Approved project direction after qualified review.</strong> This does not establish verification, validation, release readiness, or production authorization.</p>
        </div> : <p role="alert" className="form-error">Approved technical requirement proposal is missing its durable approval linkage.</p>}

        {proposal.assignments.length > 1 ? <details className="artifact-acceptance-action"><summary>Earlier review history</summary>{proposal.assignments.filter(item => item.id !== currentAssignment?.id).map(item => <div className="entry-note" key={item.id}><strong>Revision {item.proposal_revision} · {item.review?.conclusion ?? item.status}</strong><p>Assignment {item.id}{item.review ? ` · Review ${item.review.id}` : ""}</p></div>)}</details> : null}
      </article>;
    })}</div> : <article className="durable-card"><h3>No consequential technical requirements yet.</h3><p>Use this flow only when required technical behavior needs qualified specialist judgment before it becomes an approved requirement.</p></article>}

    <article className="durable-card requirement-form-card"><span className="eyebrow">Consequential technical behavior</span><h3>Record a technical requirement proposal</h3><p>This creates Proposed technical behavior only. A specialist must review this exact requirement and acceptance criterion, and the owner must later approve it separately.</p><CreateTechnicalRequirementForm workspaceId={workspaceId} requestId={randomUUID()} /></article>
  </section>;
}
