import Link from "next/link";
import { randomUUID } from "node:crypto";
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
      <div className="durable-heading">
        <span className="eyebrow">Your projects</span>
        <h1>What would you like to work on?</h1>
        <p>Pick up a project or start with a problem you want to solve.</p>
      </div>
      {singleUser ? (
        <details className="create-disclosure">
          <summary>+ New project</summary>
          <div className="durable-card">
            <h2>New project</h2>
            <CreateWorkspaceForm requestId={randomUUID()} />
          </div>
        </details>
      ) : (
        <section className="durable-card">
          <h2>Create a workspace</h2>
          <LegacyCreateWorkspaceForm requestId={randomUUID()} />
        </section>
      )}
      <section aria-label="Your projects" className="project-grid">
        {workspaces.length ? (
          workspaces.map((w) => (
            <Link
              key={w.id}
              className="durable-card workspace-link"
              href={`/workspaces/${w.id}`}
            >
              <h2>{w.name}</h2>
              <p>
                {w.release.label} · Stage {w.release.current_stage} of 15
              </p>
              <p>{stageCatalog[w.release.current_stage - 1]?.name}</p>
              <span className="text-link">Open project →</span>
            </Link>
          ))
        ) : (
          <div className="durable-card">
            <h2>No projects yet.</h2>
            <p>
              Choose “+ New project” to name your project and describe the
              problem.
            </p>
          </div>
        )}
      </section>
    </WorkspaceFrame>
  );
}
