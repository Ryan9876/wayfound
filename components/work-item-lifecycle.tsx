"use client";
import { useActionState, useState } from "react";
import { transitionWorkItem } from "@/app/workspaces/actions";
import { AiWorkReview } from "@/components/ai-work-review";
import { WorkItemDependencies } from "@/components/work-item-dependencies";
import type { WorkItemRecord } from "@/lib/domain/work-item";

type WorkAction = {
  targetStatus: string;
  action: string;
  reason: string;
  confirmation: string;
};

const actionsByStatus: Record<string, WorkAction[]> = {
  Proposed: [
    {
      targetStatus: "Approved",
      action: "Approve work",
      reason: "Why approve this work?",
      confirmation:
        "I approve this work. Technical choices that need outside review still need that review.",
    },
  ],
  Approved: [
    {
      targetStatus: "In progress",
      action: "Start work",
      reason: "What work has started?",
      confirmation: "I confirm that I have started this work.",
    },
  ],
  "In progress": [
    {
      targetStatus: "Implemented",
      action: "Mark implemented",
      reason: "What was completed?",
      confirmation:
        "I confirm that the described work is complete as implemented work. Verification is separate.",
    },
    {
      targetStatus: "Blocked",
      action: "Block work",
      reason: "What dependency or decision blocks this work?",
      confirmation:
        "I confirm that this work cannot proceed until the named blocker is resolved.",
    },
  ],
  Blocked: [
    {
      targetStatus: "In progress",
      action: "Resume work",
      reason: "How was the blocker resolved?",
      confirmation:
        "I confirm that the blocker is resolved and I have resumed this work.",
    },
  ],
  Implemented: [],
};

function WorkTransitionAction({
  item,
  requestId,
  definition,
}: {
  item: WorkItemRecord;
  requestId: string;
  definition: WorkAction;
}) {
  const [state, action, pending] = useActionState(transitionWorkItem, {
    error: "",
  });
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const suffix = definition.targetStatus.toLowerCase().replaceAll(" ", "-");

  return (
    <details className="work-action">
      <summary>{definition.action}</summary>
      <form
        action={action}
        className="durable-form work-transition-form"
        aria-label={`${definition.action}: ${item.title}`}
      >
        <input type="hidden" name="workspaceId" value={item.workspace_id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="expectedRevision" value={item.revision} />
        <input type="hidden" name="targetStatus" value={definition.targetStatus} />
        <input type="hidden" name="requestId" value={requestId} />
        <label htmlFor={`work-reason-${suffix}-${item.id}`}>
          {definition.reason}
          <textarea
            id={`work-reason-${suffix}-${item.id}`}
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            maxLength={2000}
          />
        </label>
        <label className="owner-confirm" htmlFor={`work-confirm-${suffix}-${item.id}`}>
          <input
            id={`work-confirm-${suffix}-${item.id}`}
            name="confirm"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
            required
          />
          <span>{definition.confirmation}</span>
        </label>
        <p className="form-help">
          {definition.targetStatus === "Implemented"
            ? "This records implementation only. It does not verify the result, complete the stage, or make the release ready."
            : "This updates work progress only. It does not verify the result, validate the project, or release anything."}
        </p>
        {state.error && <p role="alert" className="form-error">{state.error}</p>}
        <button className="button secondary" type="submit" disabled={pending}>
          {pending ? "Saving work state…" : definition.action}
        </button>
      </form>
    </details>
  );
}

export function WorkItemLifecycle({ item, requestId }: { item: WorkItemRecord; requestId: string }) {
  const latest = item.transitions.at(-1);
  const actions = actionsByStatus[item.status] ?? [];

  return (
    <div className="work-lifecycle">
      {latest && (
        <div className="entry-note">
          <strong>
            {item.status === "Blocked"
              ? "Current blocker"
              : item.status === "Implemented"
                ? "Implementation note"
                : "Latest work update"}
          </strong>
          <p>{latest.reason}</p>
        </div>
      )}
      {item.transitions.length > 0 && (
        <details className="work-transition-history">
          <summary>Earlier changes · {item.transitions.length} changes</summary>
          <ol>
            {item.transitions.map((transition) => (
              <li key={transition.id}>
                <strong>{transition.from_status} → {transition.to_status}</strong>
                <p>{transition.reason}</p>
                <small>
                  Revision {transition.from_revision} → {transition.to_revision} ·{" "}
                  <time dateTime={transition.created_at}>{new Date(transition.created_at).toISOString()}</time>
                </small>
                <code>Actor ID: {transition.actor_id}</code>
                <code>Transition ID: {transition.id}</code>
              </li>
            ))}
          </ol>
        </details>
      )}
      <WorkItemDependencies
        item={item}
        addRequestId={requestId}
        removeRequestId={requestId}
      />
      {item.status === "Implemented" && (
        <>
          <p className="form-help">Implementation is recorded. Verification and release status remain separate.</p>
          <AiWorkReview item={item} requestId={requestId} />
        </>
      )}
      {actions.map((definition) => (
        <WorkTransitionAction key={definition.targetStatus} item={item} requestId={requestId} definition={definition} />
      ))}
    </div>
  );
}
