import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowUpRight } from "lucide-react";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { CreateWorkspaceForm } from "@/components/workspace-forms";
import { CreateWorkspaceForm as LegacyCreateWorkspaceForm } from "@/components/legacy-workspace-forms";
import { workspaceService } from "@/lib/application/workspaces";
import { stageCatalog } from "@/lib/domain/journey";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await (await workspaceService()).list();
  const singleUser = process.env.WAYFOUND_SINGLE_USER_MODE === "true";

  return (
    <WorkspaceFrame signedIn>
      <div className="wf-projects-page">
        <header className="wf-projects-hero">
          <div className="durable-heading wf-projects-heading">
            <span className="eyebrow">Your projects</span>
            <h1>What would you like to work on?</h1>
            <p>
              Pick up a project or start with a problem you want to solve.
              Wayfound keeps the path, records, and next useful step together.
            </p>
          </div>
          <div className="wf-projects-summary" aria-label={`${workspaces.length} projects`}>
            <strong>{workspaces.length}</strong>
            <span>{workspaces.length === 1 ? "active project" : "active projects"}</span>
          </div>
        </header>

        {singleUser ? (
          <details className="create-disclosure wf-projects-create">
            <summary>+ New project</summary>
            <div className="durable-card wf-project-create-card">
              <span className="eyebrow">Start with the problem</span>
              <h2>New project</h2>
              <CreateWorkspaceForm requestId={randomUUID()} />
            </div>
          </details>
        ) : (
          <section className="durable-card wf-project-create-card">
            <h2>Create a workspace</h2>
            <LegacyCreateWorkspaceForm requestId={randomUUID()} />
          </section>
        )}

        <section aria-label="Your projects" className="project-grid wf-projects-grid">
          {workspaces.length ? (
            workspaces.map((workspace) => {
              const currentStage = stageCatalog[workspace.release.current_stage - 1];
              const progress = Math.max(6.67, Math.min(100, (workspace.release.current_stage / 15) * 100));

              return (
                <Link
                  key={workspace.id}
                  className="durable-card workspace-link wf-project-card"
                  href={`/workspaces/${workspace.id}`}
                >
                  <div className="wf-project-card-top">
                    <div>
                      <span className="wf-project-card-kicker">
                        {workspace.release.label} · {workspace.release.lifecycle}
                      </span>
                      <h2>{workspace.name}</h2>
                    </div>
                    <span className="wf-project-card-arrow" aria-hidden="true">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>

                  <div className="wf-project-card-meta">
                    <div className="wf-project-card-stage">
                      <strong>{currentStage?.name ?? "Project stage"}</strong>
                      <span>Stage {workspace.release.current_stage} of 15</span>
                    </div>
                    <div
                      className="wf-stage-progress"
                      role="progressbar"
                      aria-label={`${workspace.name} journey progress`}
                      aria-valuemin={1}
                      aria-valuemax={15}
                      aria-valuenow={workspace.release.current_stage}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="wf-project-card-footer">
                      <span>Continue from the current project record.</span>
                      <strong>Open project →</strong>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="wf-projects-empty">
              <div>
                <span className="eyebrow">No projects yet</span>
                <h2>Start with one problem worth clarifying.</h2>
                <p>
                  Choose “+ New project” to name your project and describe the
                  problem.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
