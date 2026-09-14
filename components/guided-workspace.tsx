import Link from "next/link";
import { randomUUID } from "node:crypto";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceNavigation } from "./workspace-navigation";
import { WorkItemLifecycle } from "./work-item-lifecycle";
import {
  CreateDecisionForm,
  CreateWorkItemForm,
  CreateRequirementForm,
  CreateEvidenceForm,
  CreateArtifactForm,
  AcceptArtifactVersionForm,
} from "./workspace-forms";
import { stageCatalog } from "@/lib/domain/journey";
import { stageGuidance, type WorkspaceView } from "@/lib/workspace-guidance";
import type { Workspace } from "@/lib/domain/workspace";
import type { DecisionRecord } from "@/lib/domain/decision";
import type { WorkItemRecord } from "@/lib/domain/work-item";
import type { RequirementRecord } from "@/lib/domain/requirement";
import type { EvidenceRecord } from "@/lib/domain/evidence";
import type { ArtifactRecord } from "@/lib/domain/artifact";

type Props = {
  workspace: Workspace;
  view: WorkspaceView;
  decisions: DecisionRecord[];
  workItems: WorkItemRecord[];
  requirements: RequirementRecord[];
  evidence: EvidenceRecord[];
  artifacts: ArtifactRecord[];
  outsideReview: {
    id: string;
    title: string;
    status: string;
    revision: number;
  }[];
};
function Details({ children }: { children: React.ReactNode }) {
  return (
    <details className="record-details">
      <summary>Details</summary>
      <div>{children}</div>
    </details>
  );
}
function Add({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="create-disclosure">
      <summary>{label}</summary>
      <div className="form-surface">{children}</div>
    </details>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="record-empty">{children}</p>;
}
function DateLabel({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}{" "}
      UTC
    </time>
  );
}

export function GuidedWorkspace({
  workspace,
  view,
  decisions,
  workItems,
  requirements,
  evidence,
  artifacts,
  outsideReview,
}: Props) {
  const current = stageCatalog[workspace.release.current_stage - 1];
  const guidance = stageGuidance[workspace.release.current_stage - 1];
  const href = (target: WorkspaceView, anchor = "") =>
    `/workspaces/${workspace.id}?view=${target}${anchor ? `#${anchor}` : ""}`;
  const blocked = workItems.filter((item) => item.status === "Blocked");
  const pendingReview = outsideReview.filter(
    (item) => item.status === "Proposed",
  );
  const currentWork =
    workItems.find(
      (item) =>
        item.stage_number === current.number && item.status === "In progress",
    ) ??
    workItems.find(
      (item) =>
        item.stage_number === current.number && item.status === "Approved",
    ) ??
    workItems.find((item) => item.stage_number === current.number);
  const next = blocked[0] ?? currentWork;
  const changes = [
    ...decisions.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "Decision",
      status: item.status,
      date: item.updated_at,
      link: href("records", "decisions"),
    })),
    ...workItems.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "Work",
      status: item.status,
      date: item.updated_at,
      link: href("work", `work-item-${item.id}`),
    })),
    ...requirements.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "Requirement",
      status: item.status,
      date: item.updated_at,
      link: href("records", "requirements"),
    })),
    ...evidence.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "Evidence",
      status: item.effect,
      date: item.updated_at,
      link: href("records", `criterion-${item.acceptance_criterion_id}`),
    })),
    ...artifacts.map((item) => ({
      id: item.id,
      title: item.title,
      kind: "Document",
      status: item.accepted_version_id ? "Accepted" : "Proposed",
      date: item.updated_at,
      link: href("records", `artifact-${item.id}`),
    })),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 6);
  return (
    <WorkspaceFrame signedIn>
      <div className="guided-workspace">
        <WorkspaceNavigation id={workspace.id} active={view} />
        <div className="project-content">
          <header className="project-heading">
            <span className="eyebrow">
              {workspace.release.label} ·{" "}
              <span>{workspace.release.lifecycle}</span>
            </span>
            <h1>{workspace.name}</h1>
            <p>
              Stage {current.number} of 15 · {current.name}
            </p>
          </header>
          {view === "overview" && (
            <>
              <h2 className="project-orientation">{guidance.state}</h2>
              <article
                className="durable-card guided-next"
                aria-labelledby="next-title"
              >
                <span className="eyebrow">Next · Suggested step</span>
                <h2 id="next-title">
                  {next
                    ? next.status === "Blocked"
                      ? `Unblock: ${next.title}`
                      : next.title
                    : guidance.next}
                </h2>
                <p>
                  {next
                    ? next.status === "Blocked"
                      ? (next.transitions.at(-1)?.reason ??
                        "Review what is stopping this work.")
                      : next.outcome
                    : guidance.why}
                </p>
                {next && (
                  <p className="next-why">
                    {next.status === "Blocked"
                      ? "Resolve what is stopping this work before resuming it."
                      : "Keep this step small enough to finish and check."}
                  </p>
                )}
                <Link
                  className="button primary"
                  href={href(
                    "work",
                    next ? `work-item-${next.id}` : "work-items",
                  )}
                >
                  {next ? "Open this work" : "Plan this step"}
                  <span aria-hidden="true"> →</span>
                </Link>
              </article>
              <div className="overview-knowledge">
                <section className="durable-card">
                  <h2>What we know</h2>
                  <span className="eyebrow">Problem · Your starting point</span>
                  <p>{workspace.problem_statement}</p>
                  <p className="form-help">
                    This is your description, not a verified finding.
                  </p>
                  {decisions.slice(0, 2).map((item) => (
                    <div className="knowledge-item" key={item.id}>
                      <span className="eyebrow">Decision · {item.status}</span>
                      <p>{item.decision}</p>
                    </div>
                  ))}
                  <Link className="text-link" href={href("records")}>
                    Review records →
                  </Link>
                </section>
                <section className="durable-card">
                  <h2>What we still need to answer</h2>
                  <span className="eyebrow">Suggested question</span>
                  <p>{guidance.question}</p>
                  {blocked.map((item) => (
                    <div className="knowledge-item" key={item.id}>
                      <span className="eyebrow">Issue · Blocked work</span>
                      <Link href={href("work", `work-item-${item.id}`)}>
                        {item.title}
                      </Link>
                    </div>
                  ))}
                  {pendingReview.map((item) => (
                    <div className="knowledge-item" key={item.id}>
                      <span className="eyebrow">
                        Needs outside review · {item.status}
                      </span>
                      <p>{item.title}</p>
                    </div>
                  ))}
                  <Details>
                    <p>
                      Suggested questions are guidance, not saved open-question
                      records. Dedicated fact, assumption, risk, issue, and
                      open-question records are not available yet.
                    </p>
                  </Details>
                </section>
              </div>
              <section className="durable-card recent-changes">
                <h2>Recent changes</h2>
                <p className="form-help">
                  Latest saved updates. Open a record for its details.
                </p>
                {changes.length ? (
                  <ul>
                    {changes.map((item) => (
                      <li key={item.id}>
                        <Link href={item.link}>
                          <strong>{item.title}</strong>
                          <span>
                            {item.kind} · {item.status}
                          </span>
                        </Link>
                        <DateLabel value={item.date} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>
                    No record changes yet. Your project is ready for its first
                    step.
                  </Empty>
                )}
              </section>
            </>
          )}
          {view === "journey" && (
            <section aria-labelledby="journey-title">
              <h2 id="journey-title">Your journey</h2>
              <p>
                Use these stages to see where you are and what comes next. Work
                can span more than one stage.
              </p>
              <ol className="guided-journey">
                {workspace.stages.map((stage) => {
                  const catalog = stageCatalog[stage.stage_number - 1];
                  return (
                    <li
                      className="durable-card"
                      key={stage.stage_number}
                      aria-current={
                        stage.stage_number === current.number
                          ? "step"
                          : undefined
                      }
                    >
                      <span className="journey-number">
                        {stage.stage_number}
                      </span>
                      <div>
                        <h3>{catalog.name}</h3>
                        <p>{stageGuidance[stage.stage_number - 1].why}</p>
                        <span className="status-chip">
                          {(
                            {
                              active: "Current stage",
                              upcoming: "Upcoming",
                              complete: "Complete",
                              reopened: "Reopened",
                              blocked: "Blocked",
                            } as Record<string, string>
                          )[stage.state] ?? stage.state}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="form-help">
                Stage changes are not available here yet. Planning work does not
                mark a stage complete.
              </p>
            </section>
          )}
          {view === "work" && (
            <section id="work-items" aria-labelledby="work-section-title">
              <h2 id="work-section-title">Work</h2>
              <p>
                Choose a clear result, then decide what will show it worked.
              </p>
              <Add label="Add work">
                <CreateWorkItemForm
                  workspaceId={workspace.id}
                  requestId={randomUUID()}
                />
              </Add>
              {workItems.length ? (
                <div className="record-stack">
                  {workItems.map((item) => (
                    <article
                      className="durable-card work-item-card"
                      id={`work-item-${item.id}`}
                      key={item.id}
                    >
                      <span className="status-chip">{item.status}</span>
                      <h3>{item.title}</h3>
                      <p>{item.outcome}</p>
                      <div className="work-item-detail">
                        <strong>Done when</strong>
                        <p>{item.completion_condition}</p>
                      </div>
                      <div className="work-item-detail">
                        <strong>What will show it worked?</strong>
                        <p>{item.evidence_expectation}</p>
                      </div>
                      <Details>
                        <p>
                          Owner: You · Stage {item.stage_number} · Revision{" "}
                          {item.revision}
                        </p>
                        <code>Work item ID: {item.id}</code>
                        <code>Owner ID: {item.owner_actor_id}</code>
                      </Details>
                      <WorkItemLifecycle
                        key={`${item.id}-${item.revision}`}
                        item={item}
                        requestId={randomUUID()}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <Empty>No work added yet. Start with one small step.</Empty>
              )}
            </section>
          )}
          {view === "records" && (
            <section aria-labelledby="records-title">
              <h2 id="records-title">Records</h2>
              <p>
                Your decisions, requirements, evidence, and documents. Each
                keeps its own status.
              </p>
              <section
                id="decisions"
                className="record-group"
                aria-labelledby="decisions-title"
              >
                <h3 id="decisions-title">
                  Decisions{" "}
                  <span className="record-count">{decisions.length}</span>
                </h3>
                <Add label="Add decision">
                  <CreateDecisionForm
                    workspaceId={workspace.id}
                    requestId={randomUUID()}
                  />
                </Add>
                {decisions.length ? (
                  decisions.map((item) => (
                    <article className="durable-card" key={item.id}>
                      <span className="status-chip">{item.status}</span>
                      <h4>{item.title}</h4>
                      <p>{item.decision}</p>
                      <Details>
                        <strong>Why?</strong>
                        <p>{item.rationale}</p>
                        <p>
                          Authority: Product owner · Stage {item.stage_number} ·
                          Revision {item.revision}
                        </p>
                        <code>Decision ID: {item.id}</code>
                      </Details>
                    </article>
                  ))
                ) : (
                  <Empty>No decisions yet.</Empty>
                )}
              </section>
              <section
                id="requirements"
                className="record-group"
                aria-labelledby="requirements-title"
              >
                <h3 id="requirements-title">
                  Requirements & evidence{" "}
                  <span className="record-count">{requirements.length}</span>
                </h3>
                <Add label="Add requirement">
                  <CreateRequirementForm
                    workspaceId={workspace.id}
                    requestId={randomUUID()}
                  />
                </Add>
                {requirements.length ? (
                  requirements.map((item) => (
                    <article
                      className="durable-card requirement-card"
                      key={item.id}
                    >
                      <span className="status-chip">{item.status}</span>
                      <h4>{item.title}</h4>
                      <p>
                        <strong>
                          {
                            {
                              MUST: "Required",
                              SHOULD: "Recommended",
                              MAY: "Optional",
                            }[item.obligation]
                          }
                          :
                        </strong>{" "}
                        {item.requirement}
                      </p>
                      {item.acceptance_criteria.map((criterion) => (
                        <div
                          className="requirement-criterion"
                          id={`criterion-${criterion.id}`}
                          key={criterion.id}
                        >
                          <strong>How will we know it works?</strong>
                          <p>{criterion.statement}</p>
                          <p className="form-help">
                            This describes the check. It is not a test result.
                          </p>
                          <details className="evidence-disclosure">
                            <summary>
                              Evidence ·{" "}
                              {
                                evidence.filter(
                                  (result) =>
                                    result.acceptance_criterion_id ===
                                    criterion.id,
                                ).length
                              }{" "}
                              results
                            </summary>
                            {evidence
                              .filter(
                                (result) =>
                                  result.acceptance_criterion_id ===
                                  criterion.id,
                              )
                              .map((result) => (
                                <article
                                  className="evidence-card"
                                  key={result.id}
                                >
                                  <span className="status-chip">
                                    {result.effect}
                                  </span>
                                  <h4>{result.title}</h4>
                                  <p>{result.result}</p>
                                  <strong>Where did this come from?</strong>
                                  <p>{result.source_note}</p>
                                  <p className="form-help">
                                    Recorded evidence. This does not mark the
                                    check as passed.
                                  </p>
                                  <Details>
                                    <code>Evidence ID: {result.id}</code>
                                    <p>
                                      Requirement revision{" "}
                                      {result.requirement_revision} · Criterion
                                      revision {result.criterion_revision}
                                    </p>
                                    <DateLabel value={result.created_at} />
                                  </Details>
                                </article>
                              ))}
                            {!evidence.some(
                              (result) =>
                                result.acceptance_criterion_id === criterion.id,
                            ) && <Empty>No evidence yet.</Empty>}
                          </details>
                          <Add label="Add evidence">
                            <CreateEvidenceForm
                              workspaceId={workspace.id}
                              acceptanceCriterionId={criterion.id}
                              requestId={randomUUID()}
                            />
                          </Add>
                          <Details>
                            <p>
                              Acceptance criterion · Revision{" "}
                              {criterion.revision}
                            </p>
                            <code>Criterion ID: {criterion.id}</code>
                          </Details>
                        </div>
                      ))}
                      <Details>
                        <p>
                          Requirement · {item.obligation} · Kind: {item.kind} ·
                          Revision {item.revision}
                        </p>
                        <p>
                          Authority: {item.authority} · Stage{" "}
                          {item.stage_number}
                        </p>
                        <code>Requirement ID: {item.id}</code>
                        <p>
                          Approval defines what the product should do. Evidence
                          and verification remain separate.
                        </p>
                      </Details>
                    </article>
                  ))
                ) : (
                  <Empty>
                    No requirements yet. Add one before linking evidence to its
                    check.
                  </Empty>
                )}
              </section>
              <section
                id="artifacts"
                className="record-group"
                aria-labelledby="documents-title"
              >
                <h3 id="documents-title">
                  Documents{" "}
                  <span className="record-count">{artifacts.length}</span>
                </h3>
                <Add label="Add document">
                  <CreateArtifactForm
                    workspaceId={workspace.id}
                    requestId={randomUUID()}
                  />
                </Add>
                {artifacts.length ? (
                  artifacts.map((artifact) => (
                    <article
                      className="durable-card artifact-card"
                      id={`artifact-${artifact.id}`}
                      key={artifact.id}
                    >
                      <h4>{artifact.title}</h4>
                      {artifact.versions.map((version) => {
                        const accepted =
                          artifact.accepted_version_id === version.id &&
                          version.lifecycle === "Accepted";
                        return (
                          <div key={version.id}>
                            <span className="status-chip">
                              {version.lifecycle} · Version{" "}
                              {version.version_number}
                            </span>
                            <p>{version.summary}</p>
                            <a
                              className="text-link"
                              href={version.reference_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {version.reference_label} ↗
                            </a>
                            <p className="form-help">
                              Link only. Wayfound has not read this document.
                            </p>
                            {accepted ? (
                              <p className="form-help">
                                You accepted this version as project direction.
                                It is not proof that the content works.
                              </p>
                            ) : (
                              <Add
                                label={`Review version ${version.version_number}`}
                              >
                                <AcceptArtifactVersionForm
                                  workspaceId={workspace.id}
                                  artifactId={artifact.id}
                                  versionId={version.id}
                                  versionNumber={version.version_number}
                                  requestId={randomUUID()}
                                />
                              </Add>
                            )}
                            <Details>
                              <p>
                                Artifact · {artifact.kind} · Revision{" "}
                                {artifact.revision}
                              </p>
                              <code>Artifact ID: {artifact.id}</code>
                              <code>Version ID: {version.id}</code>
                              <p>
                                Version revision {version.revision} · Stage{" "}
                                {version.stage_number}
                              </p>
                              {accepted && artifact.accepted_at && (
                                <p>
                                  Accepted:{" "}
                                  <DateLabel value={artifact.accepted_at} />
                                </p>
                              )}
                            </Details>
                          </div>
                        );
                      })}
                    </article>
                  ))
                ) : (
                  <Empty>
                    No documents yet. Add a link to a project document you want
                    to keep.
                  </Empty>
                )}
              </section>
              {outsideReview.length > 0 && (
                <details className="record-group">
                  <summary>
                    Outside review records · {outsideReview.length}
                  </summary>
                  <p>
                    These earlier technical records keep their saved status.
                    Review and approval controls are not available in this
                    single-user view.
                  </p>
                  {outsideReview.map((item) => (
                    <article key={item.id}>
                      <h4>{item.title}</h4>
                      <p>
                        {item.status === "Proposed"
                          ? "Needs outside review"
                          : item.status}
                      </p>
                      <Details>
                        <p>
                          Status: {item.status} · Revision {item.revision}
                        </p>
                        <code>Record ID: {item.id}</code>
                      </Details>
                    </article>
                  ))}
                </details>
              )}
            </section>
          )}
          {view === "release-care" && (
            <section aria-labelledby="release-title">
              <h2 id="release-title">Release & Care</h2>
              <article className="durable-card">
                <span className="status-chip">
                  {workspace.release.lifecycle}
                </span>
                <h3>Release readiness has not been established.</h3>
                <p>
                  Before release, you need evidence that the product works, a
                  clear release plan, and a way to recover.
                </p>
                <Link
                  className="text-link"
                  href={href("records", "requirements")}
                >
                  Review requirements and evidence →
                </Link>
                <Details>
                  <p>
                    Implemented means the work exists. Validated means the
                    required checks passed. Released means the validated change
                    is available in its intended environment.
                  </p>
                  <p>
                    Release packets, release authorization, deployment outcomes,
                    and maintenance records are not available in this workspace
                    yet.
                  </p>
                  <code>Release ID: {workspace.release.id}</code>
                </Details>
              </article>
              <article className="durable-card care-note">
                <h3>Plan for ongoing care</h3>
                <p>
                  You are responsible for support in this single-user project.
                  Keep track of what to monitor and how to recover from a
                  problem.
                </p>
                <p className="form-help">
                  You can keep a linked support document in Records while
                  maintenance tracking is being built.
                </p>
              </article>
            </section>
          )}
          {view === "more" && (
            <section aria-labelledby="more-title">
              <h2 id="more-title">More</h2>
              <div className="record-stack">
                <Link
                  className="durable-card workspace-link"
                  href={href("records")}
                >
                  <h3>Records</h3>
                  <p>
                    Review decisions, requirements, evidence, and documents.
                  </p>
                </Link>
                <Link
                  className="durable-card workspace-link"
                  href={href("release-care")}
                >
                  <h3>Release & Care</h3>
                  <p>Check release state and plan ongoing support.</p>
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </WorkspaceFrame>
  );
}
