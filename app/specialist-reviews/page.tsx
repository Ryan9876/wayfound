import { randomUUID } from "node:crypto";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { SubmitSpecialistReviewForm } from "@/components/specialist-review-forms";
import { SubmitTechnicalChoiceReviewForm } from "@/components/technical-decision-forms";
import { SubmitTechnicalRequirementReviewForm } from "@/components/technical-requirement-forms";
import { specialistReviewService } from "@/lib/application/specialist-reviews";
import { technicalDecisionService } from "@/lib/application/technical-decisions";
import { technicalRequirementService } from "@/lib/application/technical-requirements";

export const dynamic = "force-dynamic";

export default async function SpecialistReviewsPage() {
  const specialistService = await specialistReviewService();
  const reviewerCode = await specialistService.identity();
  const assignments = await specialistService.listMine();
  const technicalAssignments = await (await technicalDecisionService()).listMine();
  const technicalRequirementAssignments = await (await technicalRequirementService()).listMine();
  const pendingCount = assignments.filter(item => item.status === "Pending").length;
  const technicalPendingCount = technicalAssignments.filter(item => item.status === "Pending").length;
  const technicalRequirementPendingCount = technicalRequirementAssignments.filter(item => item.status === "Pending").length;

  return <WorkspaceFrame signedIn>
    <div className="durable-heading">
      <span className="eyebrow">Specialist reviews</span>
      <h1>Review only the work assigned to you.</h1>
      <p>Wayfound keeps qualified specialist judgment separate from owner project-direction acceptance and verification.</p>
    </div>

    <div className="workspace-columns">
      <section>
        <article className="durable-card">
          <span className="eyebrow">Reviewer identity</span>
          <h2>Your reviewer code</h2>
          <code>{reviewerCode}</code>
          <p>Share this code with a product owner who needs to assign you a bounded review. The code identifies your Wayfound actor; it does not grant workspace access.</p>
        </article>

        <section id="technical-requirement-reviews" aria-labelledby="technical-requirement-review-assignments-title">
          <div className="decision-section-header">
            <div><span className="eyebrow">Consequential technical requirements</span><h2 id="technical-requirement-review-assignments-title">Technical requirement review assignments</h2><p>Each assignment is a snapshot of one exact proposal revision, including its proposed acceptance criterion, and one bounded review question.</p></div>
            <span className="status-chip">{technicalRequirementPendingCount} pending · {technicalRequirementAssignments.length - technicalRequirementPendingCount} reviewed</span>
          </div>

          {technicalRequirementAssignments.length ? <div className="artifact-list">{technicalRequirementAssignments.map(assignment => <article className="durable-card artifact-card" id={`technical-requirement-assignment-${assignment.id}`} key={assignment.id}>
            <span className="eyebrow">Technical requirement review · {assignment.status}</span>
            <h3>{assignment.proposal_title}</h3>
            <p><strong>Workspace:</strong> {assignment.workspace_name}</p>
            <p><strong>Proposal revision:</strong> {assignment.proposal_revision}</p>
            <p className="requirement-statement"><strong>{assignment.obligation}</strong><span>{assignment.requirement_statement}</span></p>
            <div className="entry-note"><strong>Proposed acceptance criterion</strong><p>{assignment.acceptance_criterion}</p></div>
            <div className="entry-note"><strong>Requested competence</strong><p>{assignment.requested_competence}</p></div>
            <div className="entry-note"><strong>Review question</strong><p>{assignment.review_question}</p></div>
            <div className="artifact-meta"><span><strong>Status:</strong> {assignment.status}</span><span><strong>Proposal revision:</strong> {assignment.proposal_revision}</span><span><strong>Assignment revision:</strong> {assignment.revision}</span></div>
            <code>Assignment ID: {assignment.id}</code><code>Proposal ID: {assignment.proposal_id}</code>

            {assignment.review ? <div className="specialist-review-record">
              <span className="eyebrow">Recorded technical requirement review</span>
              <h4>{assignment.review.conclusion}</h4>
              <p><strong>Reviewer:</strong> {assignment.review.reviewer_name}</p>
              <div className="entry-note"><strong>Declared competence</strong><p>{assignment.review.competence_statement}</p></div>
              <div className="entry-note"><strong>Summary</strong><p>{assignment.review.summary}</p></div>
              <div className="entry-note"><strong>Findings</strong><p>{assignment.review.findings}</p></div>
              <div className="artifact-meta"><span><strong>Proposal revision reviewed:</strong> {assignment.review.proposal_revision}</span><span><strong>Reviewed:</strong> <time dateTime={assignment.review.reviewed_at}>{new Date(assignment.review.reviewed_at).toISOString()}</time></span></div>
              <code>Review ID: {assignment.review.id}</code>
              <p className="artifact-warning"><strong>Review is not approval.</strong> No blocking finding only makes this exact revision eligible for a separate owner approval action. It does not establish verification, validation, release readiness, or production authorization.</p>
            </div> : <div className="artifact-acceptance-action">
              <span className="eyebrow">Your qualified judgment</span>
              <h4>Record this exact-revision technical requirement review</h4>
              <SubmitTechnicalRequirementReviewForm assignmentId={assignment.id} requestId={randomUUID()} />
            </div>}
          </article>)}</div> : <article className="durable-card"><h3>No technical requirements assigned.</h3><p>A technical requirement assignment appears here only when an owner targets your reviewer code to one exact proposed revision.</p></article>}
        </section>

        <section aria-labelledby="technical-review-assignments-title">
          <div className="decision-section-header">
            <div><span className="eyebrow">Consequential technical choices</span><h2 id="technical-review-assignments-title">Technical review assignments</h2><p>Each assignment is a snapshot of one exact proposal revision and one bounded technical review question.</p></div>
            <span className="status-chip">{technicalPendingCount} pending · {technicalAssignments.length - technicalPendingCount} reviewed</span>
          </div>

          {technicalAssignments.length ? <div className="artifact-list">{technicalAssignments.map(assignment => <article className="durable-card artifact-card" id={`technical-assignment-${assignment.id}`} key={assignment.id}>
            <span className="eyebrow">Technical choice review · {assignment.status}</span>
            <h3>{assignment.proposal_title}</h3>
            <p><strong>Workspace:</strong> {assignment.workspace_name}</p>
            <p><strong>Proposal revision:</strong> {assignment.proposal_revision}</p>
            <div className="artifact-detail"><strong>Technical choice</strong><p>{assignment.choice_statement}</p></div>
            <div className="entry-note"><strong>Rationale</strong><p>{assignment.rationale}</p></div>
            <div className="entry-note"><strong>Alternatives considered</strong><p>{assignment.alternatives}</p></div>
            <div className="entry-note"><strong>Known constraints and consequences</strong><p>{assignment.consequences}</p></div>
            <div className="entry-note"><strong>Requested competence</strong><p>{assignment.requested_competence}</p></div>
            <div className="entry-note"><strong>Review question</strong><p>{assignment.review_question}</p></div>
            <div className="artifact-meta"><span><strong>Status:</strong> {assignment.status}</span><span><strong>Proposal revision:</strong> {assignment.proposal_revision}</span><span><strong>Assignment revision:</strong> {assignment.revision}</span></div>
            <code>Assignment ID: {assignment.id}</code><code>Proposal ID: {assignment.proposal_id}</code>

            {assignment.review ? <div className="specialist-review-record">
              <span className="eyebrow">Recorded technical review</span>
              <h4>{assignment.review.conclusion}</h4>
              <p><strong>Reviewer:</strong> {assignment.review.reviewer_name}</p>
              <div className="entry-note"><strong>Declared competence</strong><p>{assignment.review.competence_statement}</p></div>
              <div className="entry-note"><strong>Summary</strong><p>{assignment.review.summary}</p></div>
              <div className="entry-note"><strong>Findings</strong><p>{assignment.review.findings}</p></div>
              <div className="artifact-meta"><span><strong>Proposal revision reviewed:</strong> {assignment.review.proposal_revision}</span><span><strong>Reviewed:</strong> <time dateTime={assignment.review.reviewed_at}>{new Date(assignment.review.reviewed_at).toISOString()}</time></span></div>
              <code>Review ID: {assignment.review.id}</code>
              <p className="artifact-warning"><strong>Review is not acceptance.</strong> No blocking finding only makes this exact revision eligible for a separate owner acceptance action. It does not establish verification, validation, release readiness, or production authorization.</p>
            </div> : <div className="artifact-acceptance-action">
              <span className="eyebrow">Your qualified judgment</span>
              <h4>Record this exact-revision technical review</h4>
              <SubmitTechnicalChoiceReviewForm assignmentId={assignment.id} requestId={randomUUID()} />
            </div>}
          </article>)}</div> : <article className="durable-card"><h3>No technical choices assigned.</h3><p>A technical assignment appears here only when an owner targets your reviewer code to one exact proposed revision.</p></article>}
        </section>

        <section aria-labelledby="specialist-assignments-title">
          <div className="decision-section-header">
            <div><span className="eyebrow">Accepted artifacts</span><h2 id="specialist-assignments-title">Artifact review assignments</h2><p>Each assignment is limited to one accepted artifact version and one review question.</p></div>
            <span className="status-chip">{pendingCount} pending · {assignments.length - pendingCount} reviewed</span>
          </div>

          {assignments.length ? <div className="artifact-list">{assignments.map(assignment => <article className="durable-card artifact-card" id={`assignment-${assignment.id}`} key={assignment.id}>
            <span className="eyebrow">Specialist review · {assignment.status}</span>
            <h3>{assignment.artifact_title}</h3>
            <p><strong>Workspace:</strong> {assignment.workspace_name}</p>
            <p><strong>Artifact kind:</strong> {assignment.artifact_kind}</p>
            <div className="artifact-detail"><strong>Artifact summary</strong><p>{assignment.artifact_summary}</p></div>
            <div className="artifact-reference"><strong>External reference</strong><p>{assignment.reference_label}</p><a href={assignment.reference_url} target="_blank" rel="noreferrer">{assignment.reference_url}</a><small>Wayfound stores this reference. It does not fetch the referenced content for specialist review.</small></div>
            <div className="entry-note"><strong>Requested competence</strong><p>{assignment.requested_competence}</p></div>
            <div className="entry-note"><strong>Review question</strong><p>{assignment.review_question}</p></div>
            <div className="artifact-meta"><span><strong>Status:</strong> {assignment.status}</span><span><strong>Version:</strong> {assignment.version_number}</span><span><strong>Artifact lifecycle:</strong> {assignment.version_lifecycle}</span><span><strong>Assignment revision:</strong> {assignment.revision}</span></div>
            <code>Assignment ID: {assignment.id}</code><code>Artifact ID: {assignment.artifact_id}</code><code>Version ID: {assignment.artifact_version_id}</code>

            {assignment.review ? <div className="specialist-review-record">
              <span className="eyebrow">Recorded specialist review</span>
              <h4>{assignment.review.conclusion}</h4>
              <p><strong>Reviewer:</strong> {assignment.review.reviewer_name}</p>
              <div className="entry-note"><strong>Declared competence</strong><p>{assignment.review.competence_statement}</p></div>
              <div className="entry-note"><strong>Summary</strong><p>{assignment.review.summary}</p></div>
              <div className="entry-note"><strong>Findings</strong><p>{assignment.review.findings}</p></div>
              <div className="artifact-meta"><span><strong>Artifact revision reviewed:</strong> {assignment.review.artifact_revision}</span><span><strong>Version revision reviewed:</strong> {assignment.review.artifact_version_revision}</span><span><strong>Reviewed:</strong> <time dateTime={assignment.review.reviewed_at}>{new Date(assignment.review.reviewed_at).toISOString()}</time></span></div>
              <code>Review ID: {assignment.review.id}</code>
              <p className="artifact-warning"><strong>Review is not verification.</strong> This specialist judgment does not by itself verify or validate the artifact, establish release readiness, or authorize production changes.</p>
            </div> : <div className="artifact-acceptance-action">
              <span className="eyebrow">Your specialist judgment</span>
              <h4>Record this bounded review</h4>
              <SubmitSpecialistReviewForm assignmentId={assignment.id} requestId={randomUUID()} />
            </div>}
          </article>)}</div> : <article className="durable-card"><h3>No artifact reviews assigned.</h3><p>Your reviewer code is ready. An assignment will appear here only after a product owner targets that code to an accepted artifact version.</p></article>}
        </section>
      </section>

      <aside className="durable-card">
        <span className="eyebrow">Authority boundary</span>
        <h2>Qualified review stays bounded.</h2>
        <p>Your review answers the assigned question within your declared competence. It does not make you the product owner and does not give you general access to the project workspace.</p>
        <div className="entry-note"><strong>Technical requirements</strong><p>No blocking finding is a required gate result for a consequential technical requirement. The owner must still separately approve that exact reviewed revision before it becomes an approved requirement.</p></div>
        <div className="entry-note"><strong>Technical decisions</strong><p>No blocking finding is a required gate result for a consequential technical choice. The owner must still separately accept that exact reviewed revision as project direction.</p></div>
        <div className="entry-note"><strong>Not verification</strong><p>A specialist review and verification evidence are different records. Wayfound does not convert one into the other.</p></div>
      </aside>
    </div>
  </WorkspaceFrame>;
}
