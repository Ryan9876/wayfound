import Link from "next/link";
import {
  House,
  Route,
  ListChecks,
  Files,
  FolderOpen,
  MessageSquareText,
  PackageCheck,
  Ellipsis,
} from "lucide-react";
import { WayfoundLogo } from "./wayfound-logo";
import { workspaceService } from "@/lib/application/workspaces";
import { stageCatalog } from "@/lib/domain/journey";
import type { WorkspaceView } from "@/lib/workspace-guidance";

export type WorkspaceDestination = WorkspaceView | "interview" | "project-files";

const destinations = [
  { view: "overview", label: "Overview", icon: House },
  { view: "interview", label: "Interview", icon: MessageSquareText },
  { view: "journey", label: "Journey", icon: Route },
  { view: "work", label: "Work", icon: ListChecks },
  { view: "records", label: "Records", icon: Files },
  { view: "project-files", label: "Project Files", icon: FolderOpen },
  { view: "release-care", label: "Release & Care", icon: PackageCheck },
] as const;

function hrefFor(id: string, view: WorkspaceDestination) {
  if (view === "interview" || view === "project-files") {
    return `/workspaces/${id}/${view}`;
  }
  return `/workspaces/${id}?view=${view}`;
}

export async function WorkspaceNavigation({
  id,
  active,
}: {
  id: string;
  active: WorkspaceDestination;
}) {
  const workspace = await (await workspaceService()).open(id);
  const currentStage = workspace
    ? stageCatalog[workspace.release.current_stage - 1]
    : undefined;
  const projectName = workspace?.name ?? "Project workspace";
  const projectContext = workspace
    ? `${workspace.release.label} · Stage ${workspace.release.current_stage}${
        currentStage ? ` · ${currentStage.name}` : ""
      }`
    : "Open project";

  const mobile = [
    destinations[0],
    destinations[1],
    destinations[2],
    destinations[3],
    { view: "more", label: "More", icon: Ellipsis } as const,
  ];
  const moreActive = ["records", "project-files", "release-care", "more"].includes(
    active,
  );

  return (
    <>
      <aside className="wf-project-rail" aria-label="Wayfound project navigation">
        <Link className="wf-project-rail-brand" href="/workspaces" aria-label="Wayfound projects">
          <WayfoundLogo />
        </Link>

        <Link className="wf-rail-project" href="/workspaces">
          <span className="wf-rail-project-label">Current project</span>
          <strong>{projectName}</strong>
          <small>{projectContext}</small>
        </Link>

        <nav className="project-sidebar" aria-label="Project navigation">
          {destinations.map(({ view, label, icon: Icon }) => (
            <Link
              key={view}
              href={hrefFor(id, view)}
              aria-current={active === view ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="wf-project-rail-bottom">
          <Link className="wf-rail-file-shortcut" href={`/workspaces/${id}/project-files`}>
            <strong>Project files</strong>
            <span>Add evidence, specifications, notes, and source material.</span>
            <b>Add files</b>
          </Link>
          <span className="wf-rail-status">Workspace · Local single-user</span>
        </div>
      </aside>

      <nav className="project-mobile-nav" aria-label="Mobile project navigation">
        {mobile.map(({ view, label, icon: Icon }) => {
          const href =
            view === "more"
              ? `/workspaces/${id}?view=more`
              : hrefFor(id, view);
          const current = active === view || (view === "more" && moreActive);
          return (
            <Link
              key={view}
              href={href}
              aria-current={current ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
