import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { WorkItemLifecycle } from "@/components/legacy-work-item-lifecycle";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { CreateDecisionForm, CreateWorkItemForm, CreateRequirementForm, CreateEvidenceForm, CreateArtifactForm, AcceptArtifactVersionForm } from "@/components/legacy-workspace-forms";
import { SpecialistReviewOwnerPanel } from "@/components/specialist-review-owner-panel";
import { AcceptTechnicalChoiceForm, AssignTechnicalChoiceReviewForm, CreateTechnicalChoiceForm, ReviseTechnicalChoiceForm } from "@/components/technical-decision-forms";
import { TechnicalRequirementOwnerPanel } from "@/components/technical-requirement-owner-panel";
import { workspaceService } from "@/lib/application/workspaces";
import { decisionService } from "@/lib/application/decisions";
import { workItemService } from "@/lib/application/work-items";
import { requirementService } from "@/lib/application/requirements";
import { evidenceService } from "@/lib/application/evidence";
import { artifactService } from "@/lib/application/artifacts";
import { specialistReviewService } from "@/lib/application/specialist-reviews";
import { technicalDecisionService } from "@/lib/application/technical-decisions";
import { technicalRequirementService } from "@/lib/application/technical-requirements";
import { stageCatalog } from "@/lib/domain/journey";



export default async function LegacyWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await (await workspaceService()).open(id);
  if (!workspace) notFound();

  const decisions = await (await decisionService()).list(id);
  const technicalChoices = await (await technicalDecisionService()).listForOwner(id);
  const workItems = await (await workItemService()).list(id);
  const technicalRequirements = await (await technicalRequirementService()).listForOwner(id);
  const requirements = await (await requirementService()).list(id);
  const evidence = await (await evidenceService()).list(id);
  const artifacts = await (await artifactService()).list(id);
  const specialistReviews = await (await specialistReviewService()).listForOwner(id);
  const acceptedArtifactCount = artifacts.filter(artifact => artifact.accepted_version_id !== null).length;
  const proposedArtifactCount = artifacts.length - acceptedArtifactCount;
  const acceptedTechnicalCount = technicalChoices.filter(choice => choice.status === "Accepted").length;
  const proposedTechnicalCount = technicalChoices.length - acceptedTechnicalCount;
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
          <div className="entry-note"><strong>Why this matters</strong><p>A clear problem gives the project a useful starting point. Requirements, acceptance criteria, evidence, artifacts, technical choices, and specialist reviews remain distinct project records.</p></div>
        </article>
        <article className="durable-card problem-record">
          <span className="eyebrow">Your problem statement</span>
          <p>{workspace.problem_statement}</p>
          <span className="form-help">Recorded at workspace creation. This statement is not verification evidence.</span>
        </article>

        <section id="decisions" className="decision-section" aria-labelledby="decisions-title">
          <div className="decision-section-header"><div><span className="eyebrow">Project record</span><h2 id="decisions-title">Decisions</h2><p>These are accepted product-scope or business choices made under product-owner authority.</p></div><span className="status-chip">{decisions.length} accepted</span></div>
          {decisions.length ? <div className="decision-list">{decisions.map(decision => <article className="durable-card decision-card" key={decision.id}><span className="eyebrow">Accepted decision</span><h3>{decision.title}</h3><p>{decision.decision}</p><div className="entry-note"><strong>Rationale</strong><p>{decision.rationale}</p></div><div className="decision-meta"><span><strong>Status:</strong> {decision.status}</span><span><strong>Authority:</strong> Product owner</span><span><strong>Stage:</strong> {decision.stage_number} · {stageCatalog[decision.stage_number - 1].name}</span><span><strong>Revision:</strong> {decision.revision}</span></div></article>)}</div> : <article className="durable-card"><h3>No accepted decisions yet.</h3><p>Record a product-scope or business choice when you are ready to make it part of project direction.</p></article>}
          <article className="durable-card decision-form-card"><span className="eyebrow">Product-owner authority</span><h3>Record an accepted decision</h3><p>Use this only for a product-scope or business decision you are authorized to approve. Consequential technical decisions use the separate reviewed technical-choice flow below.</p><CreateDecisionForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <section id="technical-decisions" className="decision-section" aria-labelledby="technical-decisions-title">
          <div className="decision-section-header"><div><span className="eyebrow">Split authority</span><h2 id="technical-decisions-title">Technical choices</h2><p>Consequential technical choices remain Proposed until the exact revision receives qualified review with No blocking finding and the owner separately accepts it as project direction.</p></div><span className="status-chip">{acceptedTechnicalCount} accepted · {proposedTechnicalCount} proposed</span></div>
          {technicalChoices.length ? <div className="decision-list">{technicalChoices.map(proposal => {
            const reviewedRevision = proposal.decision?.proposal_revision ?? proposal.revision;
            const currentAssignment = proposal.assignments.find(item => item.proposal_revision === reviewedRevision) ?? null;
            const qualifyingReview = proposal.status === "Proposed" && currentAssignment?.review?.conclusion === "No blocking finding" ? currentAssignment.review : null;
            return <article className="durable-card decision-card" id={`technical-choice-${proposal.id}`} key={proposal.id}>
              <span className="eyebrow">Technical choice · {proposal.status}</span>
              <h3>{proposal.title}</h3>
              <div className="entry-note"><strong>Proposed technical direction</strong><p>{proposal.choice_statement}</p></div>
              <div className="entry-note"><strong>Rationale</strong><p>{proposal.rationale}</p></div>
              <div className="entry-note"><strong>Alternatives considered</strong><p>{proposal.alternatives}</p></div>
              <div className="entry-note"><strong>Known constraints and consequences</strong><p>{proposal.consequences}</p></div>
              <div className="entry-note"><strong>Required specialist competence</strong><p>{proposal.requested_competence}</p></div>
              <div className="entry-note"><strong>Bounded review question</strong><p>{proposal.review_question}</p></div>
              <div className="decision-meta"><span><strong>Status:</strong> {proposal.status}</span><span><strong>Proposal revision:</strong> {proposal.revision}</span><span><strong>Stage:</strong> {proposal.stage_number} · {stageCatalog[proposal.stage_number - 1].name}</span></div>
              <code>Proposal ID: {proposal.id}</code>

              {proposal.status === "Proposed" ? <>
                <p className="artifact-warning"><strong>Not accepted project direction.</strong> Proposal status does not establish a decision, technical correctness, verification, validation, release readiness, or production authorization.</p>
                <ReviseTechnicalChoiceForm proposal={proposal} requestId={randomUUID()} />
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
                    {qualifyingReview ? <div className="artifact-acceptance-action"><span className="eyebrow">Owner project-direction authority</span><h4>Accept reviewed technical choice</h4><p>No blocking finding satisfies the qualified-review gate for this exact revision. It does not itself accept the choice.</p><AcceptTechnicalChoiceForm workspaceId={workspace.id} proposalId={proposal.id} expectedRevision={proposal.revision} requestId={randomUUID()} /></div> : <p className="artifact-warning"><strong>Acceptance gate not satisfied.</strong> {currentAssignment.review.conclusion === "Changes required" ? "The specialist requires changes before this revision can proceed." : "Advisory guidance does not satisfy the acceptance gate."}</p>}
                  </> : <p className="form-help">The assigned specialist has not recorded a review yet. Owner acceptance is unavailable.</p>}
                </div> : <div className="artifact-acceptance-action"><span className="eyebrow">Qualified review required</span><h4>Assign this exact proposal revision</h4><p>The specialist receives a bounded snapshot of revision {proposal.revision}. The assignment does not create workspace membership.</p><AssignTechnicalChoiceReviewForm workspaceId={workspace.id} proposalId={proposal.id} expectedRevision={proposal.revision} requestId={randomUUID()} /></div>}
              </> : proposal.decision ? <div className="specialist-review-record">
                <span className="eyebrow">Accepted technical decision</span>
                <h4>{proposal.decision.title}</h4>
                <p>{proposal.decision.decision}</p>
                <div className="decision-meta"><span><strong>Status:</strong> {proposal.decision.status}</span><span><strong>Authority:</strong> Owner after required specialist review</span><span><strong>Reviewed proposal revision:</strong> {proposal.decision.proposal_revision}</span><span><strong>Review conclusion:</strong> {proposal.decision.review_conclusion}</span><span><strong>Accepted:</strong> <time dateTime={proposal.decision.accepted_at}>{new Date(proposal.decision.accepted_at).toISOString()}</time></span></div>
                <code>Technical decision ID: {proposal.decision.id}</code><code>Assignment ID: {proposal.decision.assignment_id}</code><code>Review ID: {proposal.decision.review_id}</code>
                <p className="artifact-warning artifact-accepted-warning"><strong>Accepted project direction after qualified review.</strong> This does not establish verification, validation, release readiness, or production authorization.</p>
              </div> : <p role="alert" className="form-error">Accepted technical choice is missing its durable decision record.</p>}

              {proposal.assignments.length > 1 ? <details className="artifact-acceptance-action"><summary>Earlier review history</summary>{proposal.assignments.filter(item => item.id !== currentAssignment?.id).map(item => <div className="entry-note" key={item.id}><strong>Revision {item.proposal_revision} · {item.review?.conclusion ?? item.status}</strong><p>Assignment {item.id}{item.review ? ` · Review ${item.review.id}` : ""}</p></div>)}</details> : null}
            </article>;
          })}</div> : <article className="durable-card"><h3>No consequential technical choices yet.</h3><p>Use this flow only when a technical choice needs qualified specialist judgment before it can become project direction.</p></article>}
          <article className="durable-card decision-form-card"><span className="eyebrow">Consequential technical choice</span><h3>Record a proposal for qualified review</h3><p>This creates Proposed technical direction only. A specialist must review this exact revision, and the owner must later accept it separately.</p><CreateTechnicalChoiceForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <section id="work-items" className="work-item-section" aria-labelledby="work-items-title">
          <div className="work-item-section-header"><div><span className="eyebrow">Project record</span><h2 id="work-items-title">Work</h2><p>Bounded work with an explicit owner, current state, completion condition, and expected evidence.</p></div><span className="status-chip">{workItems.length} work items</span></div>
          {workItems.length ? <div className="work-item-list">{workItems.map(item => <article className="durable-card work-item-card" id={`work-item-${item.id}`} key={item.id}><span className="eyebrow">{item.status} work item</span><h3>{item.title}</h3><p>{item.outcome}</p><div className="work-item-detail"><strong>Complete when</strong><p>{item.completion_condition}</p></div><div className="work-item-detail"><strong>Evidence expected</strong><p>{item.evidence_expectation}</p></div><div className="work-item-meta"><span><strong>Status:</strong> {item.status}</span><span><strong>Owner:</strong> Product owner</span><span><strong>Stage:</strong> {item.stage_number} · {stageCatalog[item.stage_number - 1].name}</span><span><strong>Revision:</strong> {item.revision}</span></div><code>Work item ID: {item.id}</code><code>Owner ID: {item.owner_actor_id}</code><WorkItemLifecycle key={`${item.id}-${item.revision}`} item={item} requestId={randomUUID()} /></article>)}</div> : <article className="durable-card"><h3>No proposed work yet.</h3><p>Add a bounded work item when you can state its outcome and completion condition clearly.</p></article>}
          <article className="durable-card work-item-form-card"><span className="eyebrow">Owner-planned work</span><h3>Add proposed work</h3><p>This records planned work only. It does not start execution, assign a specialist, or claim implementation or verification.</p><CreateWorkItemForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <TechnicalRequirementOwnerPanel workspaceId={workspace.id} proposals={technicalRequirements} />

        <section id="requirements" className="requirement-section" aria-labelledby="requirements-title" aria-label="Requirements">
          <div className="requirement-section-header"><div><span className="eyebrow">Project record</span><h2 id="requirements-title">Requirements</h2><p>Approved product behavior and specialist-reviewed technical behavior with stable requirement, criterion, and evidence links.</p></div><span className="status-chip">{requirements.length} approved</span></div>
          {requirements.length ? <div className="requirement-list">{requirements.map(requirement => <article className="durable-card requirement-card" key={requirement.id}>
            <span className="eyebrow">Approved {requirement.kind === "technical" ? "technical" : "product"} requirement</span>
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
            <div className="requirement-meta"><span><strong>Status:</strong> {requirement.status}</span><span><strong>Kind:</strong> {requirement.kind === "technical" ? "Technical" : "Product"}</span><span><strong>Authority:</strong> {requirement.authority === "owner-after-specialist-review" ? "Owner after required specialist review" : "Product owner"}</span><span><strong>Stage:</strong> {requirement.stage_number} · {stageCatalog[requirement.stage_number - 1].name}</span><span><strong>Revision:</strong> {requirement.revision}</span></div>
            <code className="requirement-id">Requirement ID: {requirement.id}</code>
            {requirement.kind === "technical" ? <p className="evidence-warning"><strong>Approval is not verification.</strong> This technical requirement became project direction after qualified specialist review. Its acceptance criterion still requires separate evidence and verification.</p> : null}
          </article>)}</div> : <article className="durable-card"><h3>No approved requirements yet.</h3><p>Record product behavior directly or use the reviewed technical requirement flow when the requirement is consequential technical behavior.</p></article>}
          <article className="durable-card requirement-form-card"><span className="eyebrow">Product-owner authority</span><h3>Record an approved product requirement</h3><p>Use this only for product or business behavior within your authority. Consequential technical implementation requirements use the separate reviewed technical-requirement flow above.</p><CreateRequirementForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
        </section>

        <section id="artifacts" className="artifact-section" aria-labelledby="artifacts-title" aria-label="Artifacts">
          <div className="artifact-section-header"><div><span className="eyebrow">Project record</span><h2 id="artifacts-title">Artifacts</h2><p>Versioned project outputs remain proposed until an explicit owner action accepts a specific version as current project direction.</p></div><span className="status-chip">{acceptedArtifactCount} accepted · {proposedArtifactCount} proposed</span></div>
          {artifacts.length ? <div className="artifact-list">{artifacts.map(artifact => {
            const version = artifact.versions[0];
            const accepted = artifact.accepted_version_id === version.id && version.lifecycle === "Accepted";
            return <article className="durable-card artifact-card" id={`artifact-${artifact.id}`} key={artifact.id}>
              <span className="eyebrow">{accepted ? "Accepted artifact" : "Proposed artifact"} · Version {version.version_number}</span>
              <h3>{artifact.title}</h3>
              <p className="artifact-kind"><strong>Kind:</strong> {artifact.kind}</p>
              <div className="artifact-detail"><strong>Summary</strong><p>{version.summary}</p></div>
              <div className="artifact-reference"><strong>External reference</strong><p>{version.reference_label}</p><a href={version.reference_url} target="_blank" rel="noreferrer">{version.reference_url}</a><small>Wayfound stores this reference. It does not fetch the referenced content in this slice.</small></div>
              <div className="artifact-meta"><span><strong>Status:</strong> {version.lifecycle}</span><span><strong>Version:</strong> {version.version_number}</span><span><strong>Stage:</strong> {version.stage_number} · {stageCatalog[version.stage_number - 1].name}</span><span><strong>Recorder:</strong> Product owner</span><span><strong>Artifact revision:</strong> {artifact.revision}</span><span><strong>Version revision:</strong> {version.revision}</span></div>
              {accepted && artifact.accepted_at ? <div className="artifact-acceptance-meta"><strong>Accepted project direction</strong><span><strong>Authority:</strong> Product owner</span><span><strong>Accepted:</strong> <time dateTime={artifact.accepted_at}>{new Date(artifact.accepted_at).toISOString()}</time></span></div> : null}
              <code>Artifact ID: {artifact.id}</code><code>Version ID: {version.id}</code>
              {accepted ? <>
                <p className="artifact-warning artifact-accepted-warning"><strong>Accepted project direction.</strong> This records product-owner direction only. It does not establish qualified specialist review, technical correctness, verification, validation, release readiness, or production authorization.</p>
                <SpecialistReviewOwnerPanel workspaceId={workspace.id} artifactId={artifact.id} versionId={version.id} assignments={specialistReviews} />
              </> : <>
                <p className="artifact-warning"><strong>Not accepted project direction.</strong> This version remains Proposed until an authorized owner accepts this exact version.</p>
                <div className="artifact-acceptance-action"><span className="eyebrow">Product-owner authority</span><h4>Accept this version</h4><p>Use this action only when this exact version should become current project direction.</p><AcceptArtifactVersionForm workspaceId={workspace.id} artifactId={artifact.id} versionId={version.id} versionNumber={version.version_number} requestId={randomUUID()} /></div>
              </>}
            </article>;
          })}</div> : <article className="durable-card"><h3>No artifacts yet.</h3><p>Record a versioned project output when you have an external reference that should remain part of project continuity.</p></article>}
          <article className="durable-card artifact-form-card"><span className="eyebrow">Versioned project output</span><h3>Record a proposed artifact</h3><p>This creates a stable artifact identity and version 1 as Proposed. It does not accept the artifact or fetch its external content.</p><CreateArtifactForm workspaceId={workspace.id} requestId={randomUUID()} /></article>
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
