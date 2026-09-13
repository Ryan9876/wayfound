import { notFound } from "next/navigation";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { workspaceService } from "@/lib/application/workspaces";
import { stageCatalog } from "@/lib/domain/journey";
export const dynamic = "force-dynamic";
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const workspace = await (await workspaceService()).open(id);
 if (!workspace) notFound();
 const current = stageCatalog.find(s => s.number === workspace.release.current_stage)!;
 return <WorkspaceFrame signedIn><div className="durable-heading"><span className="eyebrow">Saved workspace · Revision {workspace.revision}</span><h1>{workspace.name}</h1><p>{workspace.release.label} <span className="status-chip">{workspace.release.lifecycle}</span></p><span className="stage-pill">Stage {current.number}: {current.name}</span></div><div className="workspace-columns"><section><article className="durable-card durable-next"><span className="eyebrow">Next action · Guidance</span><h2>Clarify who experiences this problem.</h2><p>Describe one situation in which the problem occurs and the outcome that would improve it.</p><div className="entry-note"><strong>Why this matters</strong><p>A clear problem gives the project a useful starting point. Evidence and requirements have not been accepted yet.</p></div></article><article className="durable-card problem-record"><span className="eyebrow">Your problem statement</span><p>{workspace.problem_statement}</p><span className="form-help">Recorded at workspace creation. This statement is not verification evidence.</span></article></section><aside className="durable-card"><span className="eyebrow">Journey</span><h2>A map, not a gate.</h2><ol className="durable-journey">{workspace.stages.map(s => <li key={s.stage_number} aria-current={s.stage_number === current.number ? "step" : undefined}><span className="journey-number">{s.stage_number}</span><span>{stageCatalog[s.stage_number - 1].name}<small>{({active:"Current stage",upcoming:"Upcoming",complete:"Complete",reopened:"Reopened",blocked:"Blocked"} as Record<string,string>)[s.state]}</small></span></li>)}</ol></aside></div></WorkspaceFrame>;
}
