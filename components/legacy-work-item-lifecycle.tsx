"use client";
import { useActionState, useState } from "react";
import { transitionWorkItem } from "@/app/workspaces/actions";
import type { WorkItemRecord, WorkItemStatus } from "@/lib/domain/work-item";

const labels = {
  Proposed: { action: "Approve work", reason: "Why approve this work?", confirmation: "I accept this bounded work for implementation within my authority. This does not approve consequential technical choices." },
  Approved: { action: "Start work", reason: "What work has started?", confirmation: "I confirm that I have started this work." },
  "In progress": { action: "Block work", reason: "What dependency or decision blocks this work?", confirmation: "I confirm that this work cannot proceed until the named blocker is resolved." },
  Blocked: { action: "Resume work", reason: "How was the blocker resolved?", confirmation: "I confirm that the blocker is resolved and I have resumed this work." },
} satisfies Record<Exclude<WorkItemStatus, "Implemented">, { action: string; reason: string; confirmation: string }>;

const targets = {
  Proposed: "Approved",
  Approved: "In progress",
  "In progress": "Blocked",
  Blocked: "In progress",
} satisfies Record<Exclude<WorkItemStatus, "Implemented">, WorkItemStatus>;

export function WorkItemLifecycle({ item, requestId }: { item: WorkItemRecord; requestId: string }) {
  const [state, action, pending] = useActionState(transitionWorkItem, { error: "" });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const latest = item.transitions.at(-1);
  const history = <>
    {latest && <div className="entry-note"><strong>{item.status === "Blocked" ? "Current blocker" : item.status === "Implemented" ? "Implementation note" : "Latest work update"}</strong><p>{latest.reason}</p></div>}
    {item.transitions.length > 0 && <details className="work-transition-history">
      <summary>Work-state history · {item.transitions.length} changes</summary>
      <ol>{item.transitions.map(transition => <li key={transition.id}>
        <strong>{transition.from_status} → {transition.to_status}</strong>
        <p>{transition.reason}</p>
        <small>Revision {transition.from_revision} → {transition.to_revision} · <time dateTime={transition.created_at}>{new Date(transition.created_at).toISOString()}</time></small>
        <code>Actor ID: {transition.actor_id}</code><code>Transition ID: {transition.id}</code>
      </li>)}</ol>
    </details>}
  </>;
  if (item.status === "Implemented") {
    return <div className="work-lifecycle">{history}<p className="form-help">Implementation is recorded. Verification, validation, and release remain separate.</p></div>;
  }
  const text = labels[item.status];
  return <div className="work-lifecycle">
    {history}
    <form action={action} className="durable-form work-transition-form" aria-label={`${text.action}: ${item.title}`}>
      <input type="hidden" name="workspaceId" value={item.workspace_id} />
      <input type="hidden" name="workItemId" value={item.id} />
      <input type="hidden" name="expectedRevision" value={item.revision} />
      <input type="hidden" name="targetStatus" value={targets[item.status]} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`work-reason-${item.id}`}>{text.reason}<textarea id={`work-reason-${item.id}`} name="reason" value={reason} onChange={event => setReason(event.target.value)} rows={3} required maxLength={2000} /></label>
      <label className="owner-confirm" htmlFor={`work-confirm-${item.id}`}><input id={`work-confirm-${item.id}`} name="confirm" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} type="checkbox" required /><span>{text.confirmation}</span></label>
      <p className="form-help">This records your work state only. It does not assign a specialist or establish implementation, review, verification, validation, or release authority.</p>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button className="button secondary" type="submit" disabled={pending}>{pending ? "Saving work state…" : text.action}</button>
    </form>
  </div>;
}