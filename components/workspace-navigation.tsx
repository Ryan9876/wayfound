import Link from "next/link";
import {
  House,
  Route,
  ListChecks,
  Files,
  PackageCheck,
  Ellipsis,
} from "lucide-react";
import type { WorkspaceView } from "@/lib/workspace-guidance";
const destinations = [
  { view: "overview", label: "Overview", icon: House },
  { view: "journey", label: "Journey", icon: Route },
  { view: "work", label: "Work", icon: ListChecks },
  { view: "records", label: "Records", icon: Files },
  { view: "release-care", label: "Release & Care", icon: PackageCheck },
] as const;
export function WorkspaceNavigation({
  id,
  active,
}: {
  id: string;
  active: WorkspaceView;
}) {
  return (
    <>
      <nav className="project-sidebar" aria-label="Project navigation">
        {destinations.map(({ view, label, icon: Icon }) => (
          <Link
            key={view}
            href={`/workspaces/${id}?view=${view}`}
            aria-current={active === view ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <nav
        className="project-mobile-nav"
        aria-label="Mobile project navigation"
      >
        {[
          ...destinations.slice(0, 3),
          { view: "more", label: "More", icon: Ellipsis },
        ].map(({ view, label, icon: Icon }) => (
          <Link
            key={view}
            href={`/workspaces/${id}?view=${view}`}
            aria-current={
              active === view ||
              (view === "more" && ["records", "release-care"].includes(active))
                ? "page"
                : undefined
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
