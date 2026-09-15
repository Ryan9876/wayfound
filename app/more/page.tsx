import Link from "next/link";
import { ArrowRight, FileText, FolderOpen, Handshake, Leaf, Map, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const destinations = [
  { href: "/interview", label: "Interview", title: "Clarify the product", text: "Turn an incomplete idea into a connected product brief.", icon: MessageSquareText },
  { href: "/journey", label: "Journey", title: "See the path", text: "Review where the project is and what comes next.", icon: Map },
  { href: "/handoffs", label: "Handoffs", title: "External review guidance", text: "Review the historical manual specialist-package concept. Active single-user collaboration remains out of scope.", icon: Handshake },
  { href: "/records", label: "Records", title: "Project continuity", text: "Review decisions, evidence, status, and versions.", icon: FileText },
  { href: "/project-files", label: "Project Files", title: "Local project context", text: "Try the session-only file workspace before durable import is implemented.", icon: FolderOpen },
  { href: "/release-care", label: "Release & Care", title: "Readiness and ownership", text: "Track release evidence, recovery, and operating responsibility.", icon: Leaf },
] as const;

export default function MorePage() {
  return (
    <AppShell active="more">
      <section className="standard-page more-page">
        <div className="page-title-row"><div><span className="eyebrow">More</span><h1>The rest of the workspace.</h1><p>Open less-frequent destinations without crowding the compact navigation.</p></div></div>
        <div className="more-grid">
          {destinations.map(({ href, label, title, text, icon: Icon }) => (
            <Link href={href} className="more-card" key={href}><span className="more-card-icon"><Icon size={21} /></span><div><span className="eyebrow">{label}</span><h2>{title}</h2><p>{text}</p></div><ArrowRight size={17} /></Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
