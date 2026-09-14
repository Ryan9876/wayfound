"use client";
import { useActionState, useState } from "react";
import { addOwnerCriterion } from "@/app/workspaces/criterion-actions";
import type { RequirementRecord } from "@/lib/domain/requirement";

export function AddCriterion({ requirement, requestId }: { requirement: RequirementRecord; requestId: string }) {
  const [state, action, pending] = useActionState(addOwnerCriterion, { error: "" });
  const [statement, setStatement] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const id = requirement.id;
  return <details className="work-action">
    <summary>Add acceptance criterion</summary>
    <form action={action} className="durable-form" aria-label={`Add acceptance criterion: ${requirement.title}`}>
      <p className="form-help">Add a condition for this product requirement. Adding a condition does not mean it passed. Existing evidence stays linked to its original condition.</p>
      <input type="hidden" name="workspaceId" value={requirement.workspace_id} />
      <input type="hidden" name="requirementId" value={id} />
      <input type="hidden" name="expectedRevision" value={requirement.revision} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`criterion-statement-${id}`}>What condition must be met?
        <textarea id={`criterion-statement-${id}`} name="statement" rows={3} required maxLength={4000} value={statement} onChange={e => setStatement(e.target.value)} />
      </label>
      <label htmlFor={`criterion-reason-${id}`}>Why is this condition needed?
        <textarea id={`criterion-reason-${id}`} name="reason" rows={3} required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />
      </label>
      <label className="owner-confirm" htmlFor={`criterion-confirm-${id}`}>
        <input id={`criterion-confirm-${id}`} name="confirm" type="checkbox" required checked={confirm} onChange={e => setConfirm(e.target.checked)} />
        <span>I confirm this is a product or business condition within my authority. It does not approve a consequential technical choice or establish verification.</span>
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button className="button secondary" type="submit" disabled={pending}>{pending ? "Saving condition…" : "Save acceptance criterion"}</button>
    </form>
  </details>;
}
