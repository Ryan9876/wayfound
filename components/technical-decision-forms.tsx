"use client";

import { useActionState } from "react";
import {
  acceptTechnicalChoice,
  assignTechnicalChoiceReview,
  createTechnicalChoice,
  reviseTechnicalChoice,
} from "@/app/workspaces/technical-decision-actions";
import { submitTechnicalChoiceReview } from "@/app/specialist-reviews/technical-decision-actions";
import type { TechnicalChoiceProposalRecord } from "@/lib/domain/technical-decision";

export function CreateTechnicalChoiceForm({ workspaceId, requestId }: { workspaceId: string; requestId: string }) {
  const [state, action, pending] = useActionState(createTechnicalChoice, { error: "" });
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor="technical-choice-title">Choice title
      <input id="technical-choice-title" name="title" required maxLength={160} placeholder="For example: Use row-level authorization for durable workspace records" />
    </label>
    <label htmlFor="technical-choice-statement">Technical choice
      <textarea id="technical-choice-statement" name="choiceStatement" rows={4} required maxLength={4000} placeholder="State the consequential technical choice being proposed." />
    </label>
    <label htmlFor="technical-choice-rationale">Rationale
      <textarea id="technical-choice-rationale" name="rationale" rows={4} required maxLength={4000} placeholder="Explain why this choice is being considered." />
    </label>
    <label htmlFor="technical-choice-alternatives">Alternatives considered
      <textarea id="technical-choice-alternatives" name="alternatives" rows={4} required maxLength={4000} placeholder="State the material alternatives and why they were not selected for this proposal." />
    </label>
    <label htmlFor="technical-choice-consequences">Known constraints and consequences
      <textarea id="technical-choice-consequences" name="consequences" rows={4} required maxLength={4000} placeholder="State known security, reliability, cost, operating, migration, or maintainability consequences." />
    </label>
    <label htmlFor="technical-choice-competence">Required specialist competence
      <textarea id="technical-choice-competence" name="requestedCompetence" rows={2} required maxLength={500} placeholder="State the competence required to review this choice." />
    </label>
    <label htmlFor="technical-choice-question">Bounded review question
      <textarea id="technical-choice-question" name="reviewQuestion" rows={3} required maxLength={2000} placeholder="State the exact question the specialist must answer." />
    </label>
    <label className="owner-confirm" htmlFor="technical-choice-confirm">
      <input id="technical-choice-confirm" name="confirmProposal" type="checkbox" required />
      <span>I confirm this is a proposed consequential technical choice for qualified review. Saving it does not accept it as project direction.</span>
    </label>
    <p className="form-help">A proposal is not a decision. It requires exact-revision specialist review and a later owner acceptance action.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button secondary" type="submit" disabled={pending}>{pending ? "Recording proposal…" : "Record technical choice proposal"}</button>
  </form>;
}

export function ReviseTechnicalChoiceForm({ proposal, requestId }: { proposal: TechnicalChoiceProposalRecord; requestId: string }) {
  const [state, action, pending] = useActionState(reviseTechnicalChoice, { error: "" });
  const suffix = proposal.id.slice(0, 8);
  return <details className="artifact-acceptance-action">
    <summary>Revise proposed technical choice</summary>
    <form action={action} className="durable-form specialist-review-form">
      <input type="hidden" name="workspaceId" value={proposal.workspace_id} />
      <input type="hidden" name="proposalId" value={proposal.id} />
      <input type="hidden" name="expectedRevision" value={proposal.revision} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`technical-revise-title-${suffix}`}>Choice title
        <input id={`technical-revise-title-${suffix}`} name="title" required maxLength={160} defaultValue={proposal.title} />
      </label>
      <label htmlFor={`technical-revise-choice-${suffix}`}>Technical choice
        <textarea id={`technical-revise-choice-${suffix}`} name="choiceStatement" rows={4} required maxLength={4000} defaultValue={proposal.choice_statement} />
      </label>
      <label htmlFor={`technical-revise-rationale-${suffix}`}>Rationale
        <textarea id={`technical-revise-rationale-${suffix}`} name="rationale" rows={4} required maxLength={4000} defaultValue={proposal.rationale} />
      </label>
      <label htmlFor={`technical-revise-alternatives-${suffix}`}>Alternatives considered
        <textarea id={`technical-revise-alternatives-${suffix}`} name="alternatives" rows={4} required maxLength={4000} defaultValue={proposal.alternatives} />
      </label>
      <label htmlFor={`technical-revise-consequences-${suffix}`}>Known constraints and consequences
        <textarea id={`technical-revise-consequences-${suffix}`} name="consequences" rows={4} required maxLength={4000} defaultValue={proposal.consequences} />
      </label>
      <label htmlFor={`technical-revise-competence-${suffix}`}>Required specialist competence
        <textarea id={`technical-revise-competence-${suffix}`} name="requestedCompetence" rows={2} required maxLength={500} defaultValue={proposal.requested_competence} />
      </label>
      <label htmlFor={`technical-revise-question-${suffix}`}>Bounded review question
        <textarea id={`technical-revise-question-${suffix}`} name="reviewQuestion" rows={3} required maxLength={2000} defaultValue={proposal.review_question} />
      </label>
      <label className="owner-confirm" htmlFor={`technical-revise-confirm-${suffix}`}>
        <input id={`technical-revise-confirm-${suffix}`} name="confirmProposal" type="checkbox" required />
        <span>I confirm this revision remains a proposal. Any review of an earlier revision cannot authorize acceptance of this revised content.</span>
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button className="button secondary" type="submit" disabled={pending}>{pending ? "Revising…" : "Save new proposal revision"}</button>
    </form>
  </details>;
}

export function AssignTechnicalChoiceReviewForm({ workspaceId, proposalId, expectedRevision, requestId }: { workspaceId: string; proposalId: string; expectedRevision: number; requestId: string }) {
  const [state, action, pending] = useActionState(assignTechnicalChoiceReview, { error: "" });
  const suffix = proposalId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="proposalId" value={proposalId} />
    <input type="hidden" name="expectedRevision" value={expectedRevision} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`technical-reviewer-code-${suffix}`}>Reviewer code
      <input id={`technical-reviewer-code-${suffix}`} name="reviewerCode" required maxLength={36} placeholder="00000000-0000-0000-0000-000000000000" />
    </label>
    <label className="owner-confirm" htmlFor={`technical-review-scope-${suffix}`}>
      <input id={`technical-review-scope-${suffix}`} name="confirmScope" type="checkbox" required />
      <span>I confirm this assignment is limited to revision {expectedRevision}, the stated competence area, and the bounded review question. Product-owner authority is not transferred.</span>
    </label>
    <p className="form-help">The reviewer receives a snapshot of this exact proposal revision and no general workspace membership.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button secondary" type="submit" disabled={pending}>{pending ? "Assigning…" : "Assign technical review"}</button>
  </form>;
}

export function AcceptTechnicalChoiceForm({ workspaceId, proposalId, expectedRevision, requestId }: { workspaceId: string; proposalId: string; expectedRevision: number; requestId: string }) {
  const [state, action, pending] = useActionState(acceptTechnicalChoice, { error: "" });
  const suffix = proposalId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="proposalId" value={proposalId} />
    <input type="hidden" name="expectedRevision" value={expectedRevision} />
    <input type="hidden" name="requestId" value={requestId} />
    <label className="owner-confirm" htmlFor={`technical-accept-confirm-${suffix}`}>
      <input id={`technical-accept-confirm-${suffix}`} name="confirmDirection" type="checkbox" required />
      <span>I accept this exact specialist-reviewed technical choice as project direction. I am not claiming independent technical verification, validation, release readiness, or production authorization.</span>
    </label>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Accepting direction…" : "Accept reviewed technical choice"}</button>
  </form>;
}

export function SubmitTechnicalChoiceReviewForm({ assignmentId, requestId }: { assignmentId: string; requestId: string }) {
  const [state, action, pending] = useActionState(submitTechnicalChoiceReview, { error: "" });
  const suffix = assignmentId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`technical-reviewer-name-${suffix}`}>Reviewer name
      <input id={`technical-reviewer-name-${suffix}`} name="reviewerName" required maxLength={160} placeholder="Your name" />
    </label>
    <label htmlFor={`technical-competence-statement-${suffix}`}>Competence statement
      <textarea id={`technical-competence-statement-${suffix}`} name="competenceStatement" rows={3} required maxLength={500} placeholder="State the experience or qualification relevant to this technical review." />
    </label>
    <label htmlFor={`technical-review-conclusion-${suffix}`}>Conclusion
      <select id={`technical-review-conclusion-${suffix}`} name="conclusion" aria-label="Technical choice review conclusion" defaultValue="Advisory" required>
        <option value="No blocking finding">No blocking finding — this exact revision may proceed to owner acceptance</option>
        <option value="Changes required">Changes required — this exact revision must not be accepted</option>
        <option value="Advisory">Advisory — guidance only; this does not satisfy the acceptance gate</option>
      </select>
    </label>
    <label htmlFor={`technical-review-summary-${suffix}`}>Review summary
      <textarea id={`technical-review-summary-${suffix}`} name="summary" rows={4} required maxLength={4000} placeholder="State your conclusion and the reasoning within the assigned scope." />
    </label>
    <label htmlFor={`technical-review-findings-${suffix}`}>Findings
      <textarea id={`technical-review-findings-${suffix}`} name="findings" rows={5} required maxLength={4000} placeholder="Record material findings, limits, and required follow-up." />
    </label>
    <label className="owner-confirm" htmlFor={`technical-competence-confirm-${suffix}`}>
      <input id={`technical-competence-confirm-${suffix}`} name="confirmCompetence" type="checkbox" required />
      <span>I confirm this review is within my declared competence and is limited to the assigned question and exact proposal revision.</span>
    </label>
    <p className="form-help">No blocking finding is a gate result only. It does not accept project direction or establish verification, validation, release readiness, or production authorization.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Recording review…" : "Record technical review"}</button>
  </form>;
}
