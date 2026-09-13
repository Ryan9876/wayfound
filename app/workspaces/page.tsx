import Link from "next/link";
import { randomUUID } from "node:crypto";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { CreateWorkspaceForm } from "@/components/workspace-forms";
import { workspaceService } from "@/lib/application/workspaces";
export const dynamic = "force-dynamic";
export default async function WorkspacesPage() {
 const workspaces = await (await workspaceService()).list();
 return <WorkspaceFrame signedIn><div className="durable-heading"><span className="eyebrow">Your workspaces</span><h1>Continue with a clear next step.</h1><p>Open an existing project or give a new problem a place to start.</p></div><div className="workspace-columns"><section><h2>Your projects</h2>{workspaces.length ? <div className="workspace-list">{workspaces.map(w => <Link key={w.id} className="durable-card workspace-link" href={`/workspaces/${w.id}`}><span className="eyebrow">Saved workspace</span><h3>{w.name}</h3><p>{w.release.label} · Stage {w.release.current_stage}</p><span className="text-link">Resume workspace →</span></Link>)}</div> : <div className="durable-card empty-workspace"><h3>Your first workspace starts here.</h3><p>Name the project and describe the problem. You can return to this record whenever you are ready.</p><span className="status-chip">No workspaces yet</span></div>}</section><section className="durable-card"><span className="eyebrow">A new beginning</span><h2>Create a workspace</h2><CreateWorkspaceForm requestId={randomUUID()} /></section></div></WorkspaceFrame>;
}
