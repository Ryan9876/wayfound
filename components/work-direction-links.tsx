"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addWorkDirectionLink,
  removeWorkDirectionLink,
} from "@/app/workspaces/direction-link-actions";
import type { WorkDirectionLinkRecord } from "@/lib/domain/work-direction-link";
import type { WorkItemRecord } from "@/lib/domain/work-item";

function targetTitle(link: WorkDirectionLinkRecord) {
  return link.target_kind === "Decision"
    ? (link.decision_title ?? "Accepted decision")
    : (link.artifact_title ?? "Accepted document");
}

function RemoveDirectionLinkForm({
  item,
  link,
  requestId,
}: {
  item: WorkItemRecord;
  link: WorkDirectionLinkRecord;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(removeWorkDirectionLink, {
    error: "",
  });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <details className="work-action direction-link-remove">
      <summary>Remove project-direction link</summary>
      <form
        action={action}
        className="durable-form"
        aria-label={`Remove project-direction link to ${targetTitle(link)}`}
      >
        <input type="hidden" name="workspaceId" value={item.workspace_id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="linkId" value={link.id} />
        <input type="hidden" name="requestId" value={requestId} />
        <label htmlFor={`direction-remove-reason-${link.id}`}>
          Why does this work no longer rely on this project direction?
          <textarea
            id={`direction-remove-reason-${link.id}`}
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            maxLength={2000}
          />
        </label>
        <label className="owner-confirm" htmlFor={`direction-remove-confirm-${link.id}`}>
          <input
            id={`direction-remove-confirm-${link.id}`}
            name="confirm"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
            required
          />
          <span>I confirm that this reliance link no longer applies. Removing it will not change the work item, decision, or document.</span>
        </label>
        {state.error && <p role="alert" className="form-error">{state.error}</p>}
        <button className="button secondary" type="submit" disabled={pending}>
          {pending ? "Removing link…" : "Remove project-direction link"}
        </button>
      </form>
    </details>
  );
}

export function WorkDirectionLinks({
  item,
  addRequestId,
  removeRequestId,
}: {
  item: WorkItemRecord;
  addRequestId: string;
  removeRequestId: string;
}) {
  const [state, action, pending] = useActionState(addWorkDirectionLink, {
    error: "",
  });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const hasCandidates =
    item.direction_decision_candidates.length > 0 ||
    item.direction_artifact_candidates.length > 0;
  const recordsHref = `/workspaces/${item.workspace_id}?view=records`;

  return (
    <section className="work-dependencies work-direction-links" aria-labelledby={`direction-title-${item.id}`}>
      <h4 id={`direction-title-${item.id}`}>Project direction</h4>
      <p className="form-help">
        Record accepted decisions or documents this work relies on. A link records reliance only; it does not decide impact or change work status.
      </p>

      {item.direction_links.length > 0 ? (
        <div className="dependency-group">
          <strong>Relies on</strong>
          <ul>
            {item.direction_links.map((link) => {
              const isDecision = link.target_kind === "Decision";
              const linkedVersionIsCurrent =
                !isDecision &&
                link.artifact_current_accepted_version_id === link.artifact_version_id;
              return (
                <li key={link.id} className="entry-note">
                  <span className="eyebrow">
                    {isDecision
                      ? `Decision · ${link.decision_status ?? "Accepted"}`
                      : `Document · Accepted version ${link.artifact_version_number ?? ""}`}
                  </span>
                  <Link className="text-link" href={recordsHref}>
                    {targetTitle(link)}
                  </Link>
                  <p>{link.reason}</p>
                  {!isDecision && !linkedVersionIsCurrent && (
                    <p className="form-help">
                      A different document version is currently accepted. Impact has not been assessed here.
                    </p>
                  )}
                  <small>
                    {isDecision
                      ? `Linked at work revision ${link.work_revision} and decision revision ${link.decision_revision}.`
                      : `Linked at work revision ${link.work_revision}, document revision ${link.artifact_revision}, and accepted version revision ${link.artifact_version_revision}.`}
                  </small>
                  <RemoveDirectionLinkForm item={item} link={link} requestId={removeRequestId} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="record-empty">No project-direction links recorded.</p>
      )}

      <details className="work-action direction-link-add">
        <summary>Link project direction</summary>
        {hasCandidates ? (
          <form action={action} className="durable-form" aria-label={`Link project direction: ${item.title}`}>
            <input type="hidden" name="workspaceId" value={item.workspace_id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="requestId" value={addRequestId} />
            <label htmlFor={`direction-target-${item.id}`}>
              What accepted project direction does this work rely on?
              <select id={`direction-target-${item.id}`} name="directionTarget" defaultValue="" required>
                <option value="" disabled>Select accepted direction</option>
                {item.direction_decision_candidates.length > 0 && (
                  <optgroup label="Accepted decisions">
                    {item.direction_decision_candidates.map((decision) => (
                      <option value={`decision:${decision.id}`} key={`decision-${decision.id}`}>
                        {decision.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                {item.direction_artifact_candidates.length > 0 && (
                  <optgroup label="Accepted documents">
                    {item.direction_artifact_candidates.map((artifact) => (
                      <option
                        value={`artifact:${artifact.artifact_id}:${artifact.version_id}`}
                        key={`artifact-${artifact.artifact_id}`}
                      >
                        {artifact.artifact_title} · version {artifact.version_number}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label htmlFor={`direction-reason-${item.id}`}>
              Why does this work rely on it?
              <textarea
                id={`direction-reason-${item.id}`}
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                required
                maxLength={2000}
              />
            </label>
            <label className="owner-confirm" htmlFor={`direction-confirm-${item.id}`}>
              <input
                id={`direction-confirm-${item.id}`}
                name="confirm"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                type="checkbox"
                required
              />
              <span>I confirm that this work relies on the selected accepted project direction. This records reliance only; it does not decide impact or change work status.</span>
            </label>
            {state.error && <p role="alert" className="form-error">{state.error}</p>}
            <button className="button secondary" type="submit" disabled={pending}>
              {pending ? "Saving link…" : "Link project direction"}
            </button>
          </form>
        ) : (
          <p className="form-help">No unlinked accepted decisions or documents are available.</p>
        )}
      </details>
    </section>
  );
}
