"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addWorkItemDependency,
  removeWorkItemDependency,
} from "@/app/workspaces/dependency-actions";
import type {
  WorkItemDependencyRecord,
  WorkItemRecord,
} from "@/lib/domain/work-item";

function RemoveDependencyForm({
  item,
  dependency,
  requestId,
}: {
  item: WorkItemRecord;
  dependency: WorkItemDependencyRecord;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(removeWorkItemDependency, {
    error: "",
  });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <details className="work-action dependency-remove">
      <summary>Remove dependency</summary>
      <form action={action} className="durable-form" aria-label={`Remove dependency on ${dependency.prerequisite_title}`}>
        <input type="hidden" name="workspaceId" value={item.workspace_id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="dependencyId" value={dependency.id} />
        <input type="hidden" name="requestId" value={requestId} />
        <label htmlFor={`dependency-remove-reason-${dependency.id}`}>
          Why does this dependency no longer apply?
          <textarea
            id={`dependency-remove-reason-${dependency.id}`}
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            maxLength={2000}
          />
        </label>
        <label className="owner-confirm" htmlFor={`dependency-remove-confirm-${dependency.id}`}>
          <input
            id={`dependency-remove-confirm-${dependency.id}`}
            name="confirm"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
            required
          />
          <span>I confirm that this dependency no longer applies. Removing it will not change either work item.</span>
        </label>
        {state.error && <p role="alert" className="form-error">{state.error}</p>}
        <button className="button secondary" type="submit" disabled={pending}>
          {pending ? "Removing dependency…" : "Remove dependency"}
        </button>
      </form>
    </details>
  );
}

export function WorkItemDependencies({
  item,
  allWorkItems,
  addRequestId,
  removeRequestId,
}: {
  item: WorkItemRecord;
  allWorkItems: WorkItemRecord[];
  addRequestId: string;
  removeRequestId: string;
}) {
  const [state, action, pending] = useActionState(addWorkItemDependency, {
    error: "",
  });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const activePrerequisites = new Set(item.dependencies.map((dependency) => dependency.prerequisite_work_item_id));
  const candidates = allWorkItems
    .filter((candidate) => candidate.id !== item.id && !activePrerequisites.has(candidate.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <section className="work-dependencies" aria-labelledby={`dependencies-title-${item.id}`}>
      <h4 id={`dependencies-title-${item.id}`}>Dependencies</h4>
      <p className="form-help">
        Dependency links show related work only. They do not automatically block, resume, or complete work.
      </p>

      {item.dependencies.length > 0 && (
        <div className="dependency-group">
          <strong>Depends on</strong>
          <ul>
            {item.dependencies.map((dependency) => (
              <li key={dependency.id} className="entry-note">
                <Link className="text-link" href={`#work-item-${dependency.prerequisite_work_item_id}`}>
                  {dependency.prerequisite_title}
                </Link>
                <p>
                  Current status: <strong>{dependency.prerequisite_status}</strong>
                </p>
                <p>{dependency.reason}</p>
                <small>
                  Linked at dependent revision {dependency.dependent_revision} and prerequisite revision {dependency.prerequisite_revision}.
                </small>
                <RemoveDependencyForm item={item} dependency={dependency} requestId={removeRequestId} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.dependents.length > 0 && (
        <div className="dependency-group">
          <strong>Needed by</strong>
          <ul>
            {item.dependents.map((dependency) => (
              <li key={dependency.id} className="entry-note">
                <Link className="text-link" href={`#work-item-${dependency.dependent_work_item_id}`}>
                  {dependency.dependent_title}
                </Link>
                <p>
                  Current status: <strong>{dependency.dependent_status}</strong>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.dependencies.length === 0 && item.dependents.length === 0 && (
        <p className="record-empty">No work dependencies recorded.</p>
      )}

      <details className="work-action dependency-add">
        <summary>Add dependency</summary>
        {candidates.length > 0 ? (
          <form action={action} className="durable-form" aria-label={`Add dependency: ${item.title}`}>
            <input type="hidden" name="workspaceId" value={item.workspace_id} />
            <input type="hidden" name="dependentWorkItemId" value={item.id} />
            <input type="hidden" name="requestId" value={addRequestId} />
            <label htmlFor={`dependency-target-${item.id}`}>
              What work must this depend on?
              <select id={`dependency-target-${item.id}`} name="prerequisiteWorkItemId" defaultValue="" required>
                <option value="" disabled>Select other work</option>
                {candidates.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>
                    {candidate.title} · {candidate.status}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`dependency-reason-${item.id}`}>
              Why is this dependency needed?
              <textarea
                id={`dependency-reason-${item.id}`}
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                required
                maxLength={2000}
              />
            </label>
            <label className="owner-confirm" htmlFor={`dependency-confirm-${item.id}`}>
              <input
                id={`dependency-confirm-${item.id}`}
                name="confirm"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                type="checkbox"
                required
              />
              <span>I confirm that this work depends on the selected work. This link does not automatically change work status.</span>
            </label>
            {state.error && <p role="alert" className="form-error">{state.error}</p>}
            <button className="button secondary" type="submit" disabled={pending}>
              {pending ? "Saving dependency…" : "Add dependency"}
            </button>
          </form>
        ) : (
          <p className="form-help">No other unlinked work is available to select.</p>
        )}
      </details>
    </section>
  );
}
