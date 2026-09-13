import { randomUUID } from "node:crypto";
import { AssignSpecialistReviewForm } from "@/components/specialist-review-forms";
import type { OwnerSpecialistReviewAssignment } from "@/lib/domain/specialist-review";

export function SpecialistReviewOwnerPanel({
  workspaceId,
  artifactId,
  versionId,
  assignments,
}: {
  workspaceId: string;
  artifactId: string;
  versionId: string;
  assignments: OwnerSpecialistReviewAssignment[];
}) {
  const relevant = assignments.filter(item => item.artifact_id === artifactId && item.artifact_version_id === versionId);
  return <section className="specialist-review-panel" aria-label="Specialist review">
    <div className="criterion-heading">
      <div><span className="eyebrow">Qualified specialist review</span><h4>Review of this accepted version</h4></div>
      <span className="status-chip">{relevant.length} assigned</span>
    </div>

    {relevant.length ? <div className="evidence-list">{relevant.map(assignment => <article className="evidence-card" key={assignment.id}>
      <span className="evidence-effect"><strong>Status:</strong> {assignment.status}</span>
      <div className="evidence-detail"><strong>Requested competence</strong><p>{assignment.requested_competence}</p></div>
      <div className="evidence-detail"><strong>Review question</strong><p>{assignment.review_question}</p></div>
      <code>Reviewer code: {assignment.reviewer_actor_id}</code><code>Assignment ID: {assignment.id}</code>
      {assignment.review ? <div className="specialist-review-record">
        <span className="eyebrow">Named specialist review</span>
        <h4>{assignment.review.conclusion}</h4>
        <p><strong>Reviewer:</strong> {assignment.review.reviewer_name}</p>
        <div className="evidence-detail"><strong>Declared competence</strong><p>{assignment.review.competence_statement}</p></div>
        <div className="evidence-detail"><strong>Summary</strong><p>{assignment.review.summary}</p></div>
        <div className="evidence-detail"><strong>Findings</strong><p>{assignment.review.findings}</p></div>
        <div className="evidence-meta"><span><strong>Artifact revision reviewed:</strong> {assignment.review.artifact_revision}</span><span><strong>Version revision reviewed:</strong> {assignment.review.artifact_version_revision}</span><span><strong>Reviewed:</strong> <time dateTime={assignment.review.reviewed_at}>{new Date(assignment.review.reviewed_at).toISOString()}</time></span></div>
        <code>Review ID: {assignment.review.id}</code>
        <p className="evidence-warning"><strong>Review is not verification.</strong> This specialist judgment does not by itself verify or validate the artifact, establish release readiness, or authorize production changes.</p>
      </div> : <p className="evidence-warning"><strong>Review pending.</strong> The assigned specialist has not yet recorded their judgment.</p>}
    </article>)}</div> : <p className="evidence-empty">No specialist review is assigned to this accepted version.</p>}

    <div className="artifact-acceptance-action">
      <span className="eyebrow">Product-owner assignment</span>
      <h4>Request a bounded specialist review</h4>
      <p>Ask the specialist to open Specialist reviews, copy their reviewer code, and send it to you. Assigning that code does not grant workspace access.</p>
      <AssignSpecialistReviewForm workspaceId={workspaceId} artifactId={artifactId} versionId={versionId} requestId={randomUUID()} />
    </div>
  </section>;
}
