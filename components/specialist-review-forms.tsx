"use client";

import { useActionState } from "react";
import { assignSpecialistReview } from "@/app/workspaces/actions";
import { submitSpecialistReview } from "@/app/specialist-reviews/actions";

export function AssignSpecialistReviewForm({
  workspaceId,
  artifactId,
  versionId,
  requestId,
}: {
  workspaceId: string;
  artifactId: string;
  versionId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(assignSpecialistReview, { error: "" });
  const suffix = versionId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="workspaceId" value={workspaceId} />
    <input type="hidden" name="artifactId" value={artifactId} />
    <input type="hidden" name="versionId" value={versionId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`reviewer-code-${suffix}`}>Reviewer code
      <input id={`reviewer-code-${suffix}`} name="reviewerCode" required maxLength={36} placeholder="00000000-0000-0000-0000-000000000000" />
    </label>
    <label htmlFor={`requested-competence-${suffix}`}>Requested competence
      <textarea id={`requested-competence-${suffix}`} name="requestedCompetence" rows={2} required maxLength={500} placeholder="For example: application security review of authorization boundaries." />
    </label>
    <label htmlFor={`review-question-${suffix}`}>Review question
      <textarea id={`review-question-${suffix}`} name="reviewQuestion" rows={3} required maxLength={2000} placeholder="State the bounded question the specialist must answer." />
    </label>
    <label className="owner-confirm" htmlFor={`review-scope-${suffix}`}>
      <input id={`review-scope-${suffix}`} name="confirmScope" type="checkbox" required />
      <span>I confirm this is a bounded specialist review of this exact accepted artifact version. Product-owner authority is not transferred.</span>
    </label>
    <p className="form-help">The reviewer code addresses an authenticated Wayfound actor. It does not grant workspace membership or owner authority.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button secondary" type="submit" disabled={pending}>{pending ? "Assigning review…" : "Assign specialist review"}</button>
  </form>;
}

export function SubmitSpecialistReviewForm({ assignmentId, requestId }: { assignmentId: string; requestId: string }) {
  const [state, action, pending] = useActionState(submitSpecialistReview, { error: "" });
  const suffix = assignmentId.slice(0, 8);
  return <form action={action} className="durable-form specialist-review-form">
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <input type="hidden" name="requestId" value={requestId} />
    <label htmlFor={`reviewer-name-${suffix}`}>Reviewer name
      <input id={`reviewer-name-${suffix}`} name="reviewerName" required maxLength={160} placeholder="Your name" />
    </label>
    <label htmlFor={`competence-statement-${suffix}`}>Competence statement
      <textarea id={`competence-statement-${suffix}`} name="competenceStatement" rows={3} required maxLength={500} placeholder="State the experience or qualification relevant to this review." />
    </label>
    <label htmlFor={`review-conclusion-${suffix}`}>Conclusion
      <select id={`review-conclusion-${suffix}`} name="conclusion" aria-label="Specialist review conclusion" defaultValue="Advisory" required>
        <option value="No blocking finding">No blocking finding — no blocking issue found within this review scope</option>
        <option value="Changes required">Changes required — findings require change before proceeding</option>
        <option value="Advisory">Advisory — guidance without a blocking/non-blocking judgment</option>
      </select>
    </label>
    <label htmlFor={`review-summary-${suffix}`}>Review summary
      <textarea id={`review-summary-${suffix}`} name="summary" rows={4} required maxLength={4000} placeholder="State the governing review conclusion and why." />
    </label>
    <label htmlFor={`review-findings-${suffix}`}>Findings
      <textarea id={`review-findings-${suffix}`} name="findings" rows={5} required maxLength={4000} placeholder="Record the material findings, limits, and follow-up needed within this review scope." />
    </label>
    <label className="owner-confirm" htmlFor={`competence-confirm-${suffix}`}>
      <input id={`competence-confirm-${suffix}`} name="confirmCompetence" type="checkbox" required />
      <span>I confirm this review is within my declared competence and is limited to the assigned question.</span>
    </label>
    <p className="form-help">Saving records specialist judgment only. It does not verify or validate the artifact, authorize release, or authorize production changes.</p>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Recording review…" : "Record specialist review"}</button>
  </form>;
}
