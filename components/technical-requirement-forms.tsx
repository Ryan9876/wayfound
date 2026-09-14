"use client";

import { useActionState } from "react";
import {
  approveTechnicalRequirement,
  assignTechnicalRequirementReview,
  createTechnicalRequirement,
  reviseTechnicalRequirement,
} from "@/app/workspaces/technical-requirement-actions";
import { submitTechnicalRequirementReview } from "@/app/specialist-reviews/technical-requirement-actions";
import type { TechnicalRequirementProposalRecord } from "@/lib/domain/technical-requirement";

export function CreateTechnicalRequirementForm({ workspaceId, requestId }: { workspaceId: string; requestId: string }) {
  const [state, action, pending] = useActionState(createTechnicalRequirement, { error: "" });
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor="technical-requirement-title">Requirement title
      <input id="technical-requirement-title" name="title" required maxLength={160} placeholder="For example: Isolate tenant data at the database boundary" />
    </label>
    <label htmlFor="technical-requirement-obligation">Obligation
      <select id="technical-requirement-obligation" name="obligation" defaultValue="MUST" required>
        <option value="MUST">MUST</option>
        <option value="SHOULD">SHOULD</option>
        <option value="MAY">MAY</option>
      </select>
    </label>
    <label htmlFor="technical-requirement-statement">Proposed technical requirement
      <textarea id="technical-requirement-statement" name="requirementStatement" rows={4} required maxLength={4000} placeholder="State the required technical behavior." />
    </label>
    <label htmlFor="technical-requirement-criterion">Proposed acceptance criterion
      <textarea id="technical-requirement-criterion" name="acceptanceCriterion" rows={4} required maxLength={4000} placeholder="State one observable condition that will later be used to judge this requirement." />
    </label>
    <label htmlFor="technical-requirement-competence">Required specialist competence
      <textarea id="technical-requirement-competence" name="requestedCompetence" rows={2} required maxLength={500} placeholder="State the competence required to review this requirement." />
    </label>
    <label htmlFor="technical-requirement-question">Bounded review question
      <textarea id="technical-requirement-question" name="reviewQuestion" rows={3} required maxLength={2000} placeholder="State the exact question the specialist must answer." />
    </label>
    <label className="owner-confirm" htmlFor="technical-requirement-confirm">
      <input id="technical-requirement-confirm" name="confirmProposal" type="checkbox" required />
      <span>I confirm this is a proposed consequential technical requirement for qualified review. Saving it does not approve it as a requirement.</span>
    </label>
    <p className="form-help">A technical requirement proposal is not an approved requirement. The exact revision requires specialist review and a later owner approval action.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button secondary" type="submit" disabled={pending}>{pending ? "Recording proposal…" : "Record technical requirement proposal"}</button>
  </form>;
}

export function ReviseTechnicalRequirementForm({ proposal, requestId }: { proposal: TechnicalRequirementProposalRecord; requestId: string }) {
  const [state, action, pending] = useActionState(reviseTechnicalRequirement, { error: "" });
  const suffix = proposal.id.slice(0, 8);
  return <details className="artifact-acceptance-action">
    <summary>Revise proposed technical requirement</summary>
    <form action={action} className="durable-form specialist-review-form">
      <input type="hidden" name="workspaceId" value={proposal.workspace_id} />
      <input type="hidden" name="proposalId" value={proposal.id} />
      <input type="hidden" name="expectedRevision" value={proposal.revision} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`technical-requirement-revise-title-${suffix}`}>Requirement title
        <input id={`technical-requirement-revise-title-${suffix}`} name="title" required maxLength={160} defaultValue={proposal.title} />
      </label>
      <label htmlFor={`technical-requirement-revise-obligation-${suffix}`}>Obligation
        <select id={`technical-requirement-revise-obligation-${suffix}`} name="obligation" defaultValue={proposal.obligation} required>
          <option value="MUST">MUST</option><option value="SHOULD">SHOULD</option><option value="MAY">MAY</option>
        </select>
      </label>
      <label htmlFor={`technical-requirement-revise-statement-${suffix}`}>Proposed technical requirement
        <textarea id={`technical-requirement-revise-statement-${suffix}`} name="requirementStatement" rows={4} required maxLength={4000} defaultValue={proposal.requirement_statement} />
      </label>
      <label htmlFor={`technical-requirement-revise-criterion-${suffix}`}>Proposed acceptance criterion
        <textarea id={`technical-requirement-revise-criterion-${suffix}`} name="acceptanceCriterion" rows={4} required maxLength={4000} defaultValue={proposal.acceptance_criterion} />
      </label>
      <label htmlFor={`technical-requirement-revise-competence-${suffix}`}>Required specialist competence
        <textarea id={`technical-requirement-revise-competence-${suffix}`} name="requestedCompetence" rows={2} required maxLength={500} defaultValue={proposal.requested_competence} />
      </label>
      <label htmlFor={`technical-requirement-revise-question-${suffix}`}>Bounded review question
        <textarea id={`technical-requirement-revise-question-${suffix}`} name="reviewQuestion" rows={3} required maxLength={2000} defaultValue={proposal.review_question} />
      </label>
      <label className="owner-confirm" htmlFor={`technical-requirement-revise-confirm-${suffix}`}>
        <input id={`technical-requirement-revise-confirm-${suffix}`} name="confirmProposal" type="checkbox" required />
        <span>I confirm this remains a proposal. Any material change, including the acceptance criterion, requires a new exact-revision specialist review.</span>
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button className="button secondary" type="submit" disabled={pending}>{pending ? "Revising…" : "Save new proposal revision"}</button>
    </form>
  </details>;
}

export function AssignTechnicalRequirementReviewForm({ workspaceId, proposalId, expectedRevision, requestId }: { workspaceId: string; proposalId: string; expectedRevision: number; requestId: string }) {
  const [state, action, pending] = useActionState(assignTechnicalRequirementReview, { error: "" });
  const suffix = proposalId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="proposalId" value={proposalId} />
    <input type="hidden" name="expectedRevision" value={expectedRevision} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`technical-requirement-reviewer-code-${suffix}`}>Reviewer code
      <input id={`technical-requirement-reviewer-code-${suffix}`} name="reviewerCode" required maxLength={36} placeholder="00000000-0000-0000-0000-000000000000" />
    </label>
    <label className="owner-confirm" htmlFor={`technical-requirement-review-scope-${suffix}`}>
      <input id={`technical-requirement-review-scope-${suffix}`} name="confirmScope" type="checkbox" required />
      <span>I confirm this assignment is limited to revision {expectedRevision}, including its acceptance criterion, the stated competence area, and the bounded review question. Owner authority is not transferred.</span>
    </label>
    <p className="form-help">The reviewer receives a snapshot of this exact proposal revision and no general workspace membership.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button secondary" type="submit" disabled={pending}>{pending ? "Assigning…" : "Assign technical requirement review"}</button>
  </form>;
}

export function ApproveTechnicalRequirementForm({ workspaceId, proposalId, expectedRevision, requestId }: { workspaceId: string; proposalId: string; expectedRevision: number; requestId: string }) {
  const [state, action, pending] = useActionState(approveTechnicalRequirement, { error: "" });
  const suffix = proposalId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="proposalId" value={proposalId} />
    <input type="hidden" name="expectedRevision" value={expectedRevision} />
    <input type="hidden" name="requestId" value={requestId} />
    <label className="owner-confirm" htmlFor={`technical-requirement-approve-confirm-${suffix}`}>
      <input id={`technical-requirement-approve-confirm-${suffix}`} name="confirmDirection" type="checkbox" required />
      <span>I approve this exact specialist-reviewed technical requirement as project direction. I am not claiming independent technical verification, validation, release readiness, or production authorization.</span>
    </label>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Approving requirement…" : "Approve reviewed technical requirement"}</button>
  </form>;
}

export function SubmitTechnicalRequirementReviewForm({ assignmentId, requestId }: { assignmentId: string; requestId: string }) {
  const [state, action, pending] = useActionState(submitTechnicalRequirementReview, { error: "" });
  const suffix = assignmentId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`technical-requirement-reviewer-name-${suffix}`}>Reviewer name
      <input id={`technical-requirement-reviewer-name-${suffix}`} name="reviewerName" required maxLength={160} placeholder="Your name" />
    </label>
    <label htmlFor={`technical-requirement-competence-statement-${suffix}`}>Competence statement
      <textarea id={`technical-requirement-competence-statement-${suffix}`} name="competenceStatement" rows={3} required maxLength={500} placeholder="State the experience or qualification relevant to this technical requirement review." />
    </label>
    <label htmlFor={`technical-requirement-review-conclusion-${suffix}`}>Conclusion
      <select id={`technical-requirement-review-conclusion-${suffix}`} name="conclusion" aria-label="Technical requirement review conclusion" defaultValue="Advisory" required>
        <option value="No blocking finding">No blocking finding — this exact revision may proceed to owner approval</option>
        <option value="Changes required">Changes required — this exact revision must not be approved</option>
        <option value="Advisory">Advisory — guidance only; this does not satisfy the approval gate</option>
      </select>
    </label>
    <label htmlFor={`technical-requirement-review-summary-${suffix}`}>Review summary
      <textarea id={`technical-requirement-review-summary-${suffix}`} name="summary" rows={4} required maxLength={4000} placeholder="State your conclusion and reasoning within the assigned scope." />
    </label>
    <label htmlFor={`technical-requirement-review-findings-${suffix}`}>Findings
      <textarea id={`technical-requirement-review-findings-${suffix}`} name="findings" rows={5} required maxLength={4000} placeholder="Record material findings, limits, and required follow-up." />
    </label>
    <label className="owner-confirm" htmlFor={`technical-requirement-competence-confirm-${suffix}`}>
      <input id={`technical-requirement-competence-confirm-${suffix}`} name="confirmCompetence" type="checkbox" required />
      <span>I confirm this review is within my declared competence and is limited to the assigned question, requirement statement, acceptance criterion, and exact proposal revision.</span>
    </label>
    <p className="form-help">No blocking finding is a gate result only. It does not approve the requirement or establish verification, validation, release readiness, or production authorization.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Recording review…" : "Record technical requirement review"}</button>
  </form>;
}
