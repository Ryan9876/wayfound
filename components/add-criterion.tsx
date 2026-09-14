"use client";
import { useActionState, useState } from "react";
import { addOwnerCriterion, withdrawOwnerCriterion } from "@/app/workspaces/criterion-actions";
import type { AcceptanceCriterionRecord, RequirementRecord } from "@/lib/domain/requirement";

function WithdrawCriterion({
  requirement,
  criterion,
  activeCount,
}: {
  requirement: RequirementRecord;
  criterion: AcceptanceCriterionRecord;
  activeCount: number;
}) {
  const [state, action, pending] = useActionState(withdrawOwnerCriterion, { error: "" });
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const canWithdraw = criterion.lifecycle === "Active" && activeCount > 1;
  const reasonId = `criterion-withdraw-reason-${criterion.id}`;
  const confirmId = `criterion-withdraw-confirm-${criterion.id}`;

  return <div className="work-item-detail" role="group" aria-label={`Acceptance criterion: ${criterion.statement}`}>
    <span className="status-chip">{criterion.lifecycle}</span>
    <p><strong>Condition:</strong> {criterion.statement}</p>
    {criterion.lifecycle === "Withdrawn" ? <>
      <p className="form-help">This condition is no longer active. Existing evidence remains historical; withdrawal is not a verification decision and no new evidence can be recorded for it.</p>
      {criterion.withdrawal && <p className="form-help">Withdrawn because: {criterion.withdrawal.reason} · Requirement revision {criterion.withdrawal.from_requirement_revision} → {criterion.withdrawal.to_requirement_revision} · Criterion revision {criterion.withdrawal.from_criterion_revision} → {criterion.withdrawal.to_criterion_revision}</p>}
    </> : canWithdraw ? <details className="work-action">
      <summary>Withdraw this condition</summary>
      <form action={action} className="durable-form" aria-label={`Withdraw acceptance criterion: ${criterion.statement}`}>
        <p className="form-help">Withdrawal keeps this condition and its evidence in history but removes the condition from active use. It does not make earlier evidence invalid or verified.</p>
        <input type="hidden" name="workspaceId" value={requirement.workspace_id} />
        <input type="hidden" name="requirementId" value={requirement.id} />
        <input type="hidden" name="criterionId" value={criterion.id} />
        <input type="hidden" name="expectedRequirementRevision" value={requirement.revision} />
        <input type="hidden" name="expectedCriterionRevision" value={criterion.revision} />
        <input type="hidden" name="requestId" value={criterion.id} />
        <label htmlFor={reasonId}>Why are you withdrawing this condition?
          <textarea id={reasonId} name="reason" rows={3} required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <label className="owner-confirm" htmlFor={confirmId}>
          <input id={confirmId} name="confirm" type="checkbox" required checked={confirm} onChange={e => setConfirm(e.target.checked)} />
          <span>I confirm this product condition should no longer be active. I understand its prior evidence and history will remain.</span>
        </label>
        {state.error && <p role="alert" className="form-error">{state.error}</p>}
        <button className="button secondary" type="submit" disabled={pending}>{pending ? "Withdrawing condition…" : "Withdraw condition"}</button>
      </form>
    </details> : <p className="form-help">This is the only active condition. Add another active condition before withdrawing this one so the approved product requirement still has a defined check.</p>}
  </div>;
}

export function AddCriterion({ requirement, requestId }: { requirement: RequirementRecord; requestId: string }) {
  const [state, action, pending] = useActionState(addOwnerCriterion, { error: "" });
  const [statement, setStatement] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const id = requirement.id;
  const activeCount = requirement.acceptance_criteria.filter(criterion => criterion.lifecycle === "Active").length;
  return <>
    <details className="work-action">
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
    </details>
    <details className="work-action">
      <summary>Manage acceptance criteria</summary>
      <div className="durable-form">
        <p className="form-help">Manage which product conditions are active without deleting their history. A withdrawn condition remains visible with its evidence and cannot receive new evidence.</p>
        {requirement.acceptance_criteria.map(criterion => <WithdrawCriterion key={`${criterion.id}-${criterion.revision}-${requirement.revision}`} requirement={requirement} criterion={criterion} activeCount={activeCount} />)}
      </div>
    </details>
  </>;
}
