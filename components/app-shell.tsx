import Link from "next/link";
import {
  Bell,
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Handshake,
  House,
  Leaf,
  Map,
  MessageSquareText,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { WayfoundLogo } from "./wayfound-logo";
import { demoRelease } from "@/lib/demo-data";

const nav = [
  { key: "overview", label: "Overview", href: "/", icon: House },
  { key: "interview", label: "Interview", href: "/interview", icon: MessageSquareText },
  { key: "journey", label: "Journey", href: "/journey", icon: Map },
  { key: "work", label: "Work", href: "/work", icon: ClipboardCheck },
  { key: "handoffs", label: "Handoffs", href: "/handoffs", icon: Handshake },
  { key: "records", label: "Records", href: "/records", icon: FileText },
  { key: "project-files", label: "Project Files", href: "/project-files", icon: FolderOpen },
  { key: "release-care", label: "Release & Care", href: "/release-care", icon: Leaf },
] as const;

type ActiveKey = (typeof nav)[number]["key"] | "more";

type AppShellProps = {
  active: ActiveKey;
  children: React.ReactNode;
};

export function AppShell({ active, children }: AppShellProps) {
  const moreActive = active === "more" || active === "handoffs" || active === "records" || active === "project-files" || active === "release-care";

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-top">
          <WayfoundLogo />
          <button className="project-switcher" type="button" aria-label="Choose project">
            <span>
              <small>Current project</small>
              <strong>{demoRelease.project} <b>•</b> {demoRelease.version}</strong>
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <nav className="desktop-nav">
            {nav.map(({ key, label, href, icon: Icon }) => (
              <Link key={key} href={href} className={active === key ? "nav-item active" : "nav-item"} aria-current={active === key ? "page" : undefined}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="avatar">JS</span>
            <span className="profile-copy"><strong>Jordan Singh</strong><small>Product Lead</small></span>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
          <Link className="text-link" href="/workspaces">Your workspaces →</Link>
          <div className="sync-state">
            <span className="sync-dot" aria-hidden="true" />
            <span><strong>Prototype record</strong><small>Fixture data • not synced</small></span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <p>Turn ambiguity into an ordered path.</p>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search</span>
              <input placeholder="Search anything..." aria-label="Search anything" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" type="button" aria-label="Notifications"><Bell size={18} /></button>
            <span className="avatar small">JS</span>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <Link href="/" className={active === "overview" ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={active === "overview" ? "page" : undefined}><House size={20} /><span>Overview</span></Link>
        <Link href="/interview" className={active === "interview" ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={active === "interview" ? "page" : undefined}><MessageSquareText size={20} /><span>Interview</span></Link>
        <Link href="/journey" className={active === "journey" ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={active === "journey" ? "page" : undefined}><Map size={20} /><span>Journey</span></Link>
        <Link href="/work" className={active === "work" ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={active === "work" ? "page" : undefined}><BookOpenCheck size={20} /><span>Work</span></Link>
        <Link href="/more" className={moreActive ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={moreActive ? "page" : undefined}><MoreHorizontal size={20} /><span>More</span></Link>
      </nav>
    </div>
  );
}
