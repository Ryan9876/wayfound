import Link from "next/link";
import { InterviewExperience } from "./interview-experience";
import { ProjectFiles } from "./project-files";
import { WorkspaceFrame } from "./workspace-frame";
import { WorkspaceNavigation, type WorkspaceDestination } from "./workspace-navigation";
import type { Workspace } from "@/lib/domain/workspace";

export type DefinitionView = Extract<WorkspaceDestination, "interview" | "project-files" | "more">;

export async function WorkspaceDefinitionView({ workspace, view }: { workspace: Workspace; view: DefinitionView }) {
  return (
    <WorkspaceFrame signedIn>
      <div className="wf-workspace-experience">
        <WorkspaceNavigation id={workspace.id} active={view} />
        <div className="project-content">
          <header className="wf-workspace-heading">
            <span className="eyebrow">{workspace.release.label} · <span>{workspace.release.lifecycle}</span></span>
            <h1>{workspace.name}</h1>
            <p>Product definition and project context remain draft guidance until you explicitly accept them through the applicable Wayfound record workflow.</p>
          </header>
          {view === "interview" ? <InterviewExperience initialIdea={workspace.problem_statement} contextLabel="Workspace draft" /> : null}
          {view === "project-files" ? <ProjectFiles /> : null}
          {view === "more" ? (
            <section aria-labelledby="workspace-more-title">
              <span className="wf-kicker">More</span>
              <h1 id="workspace-more-title">Project destinations</h1>
              <p>Open the less-frequent parts of this workspace without crowding the mobile navigation.</p>
              <div className="wf-more-grid">
                <Link className="wf-more-card" href={`/workspaces/${workspace.id}?view=journey`}><span className="wf-kicker">Journey</span><h2>See the path</h2><p>Review the 15-stage journey and the project’s current position.</p></Link>
                <Link className="wf-more-card" href={`/workspaces/${workspace.id}?view=records`}><span className="wf-kicker">Records</span><h2>Review project continuity</h2><p>Open decisions, requirements, evidence, and linked documents.</p></Link>
                <Link className="wf-more-card" href={`/workspaces/${workspace.id}/project-files`}><span className="wf-kicker">Project Files</span><h2>Evaluate local file context</h2><p>Add files to the session-only frontend workspace. Durable import is not implemented yet.</p></Link>
                <Link className="wf-more-card" href={`/workspaces/${workspace.id}?view=release-care`}><span className="wf-kicker">Release & Care</span><h2>Keep readiness honest</h2><p>Review release state and the responsibilities that remain after implementation.</p></Link>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </WorkspaceFrame>
  );
}
