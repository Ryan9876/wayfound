"use client";

import { useActionState, useState } from "react";
import { dispositionAiReview, requestAiWorkReview } from "@/app/workspaces/ai-review-actions";
import type { AiReviewDisposition, AiReviewRecord } from "@/lib/domain/ai-review";
import type { WorkItemRecord } from "@/lib/domain/work-item";

function ReviewDispositionForm({ item, review }: { item: WorkItemRecord; review: AiReviewRecord }) {
  const [state, action, pending] = useActionState(dispositionAiReview, { error: "" });
  const [disposition, setDisposition] = useState<AiReviewDisposition>("Use as input");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <details className="work-action ai-review-disposition">
      <summary>Record how you will use this review</summary>
      <form action={action} className="durable-form" aria-label={`AI review disposition: ${item.title}`}>
        <input type="hidden" name="workspaceId" value={item.workspace_id} />
        <input type="hidden" name="workItemId" value={item.id} />
        <input type="hidden" name="reviewId" value={review.id} />
        <input type="hidden" name="requestId" value={review.id} />
        <label htmlFor={`ai-disposition-${review.id}`}>
          How will you use this advice?
          <select
            id={`ai-disposition-${review.id}`}
            name="disposition"
            value={disposition}
            onChange={(event) => setDisposition(event.target.value as AiReviewDisposition)}
          >
            <option>Use as input</option>
            <option>Needs follow-up</option>
            <option>Do not use</option>
          </select>
        </label>
        <label htmlFor={`ai-disposition-note-${review.id}`}>
          Why?
          <textarea
            id={`ai-disposition-note-${review.id}`}
            name="note"
            rows={3}
            maxLength={2000}
            required
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <label className="owner-confirm" htmlFor={`ai-disposition-confirm-${review.id}`}>
          <input
            id={`ai-disposition-confirm-${review.id}`}
            name="confirm"
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>I confirm this records my treatment of AI advice only. It does not verify or approve the work.</span>
        </label>
        {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}
        <button className="button secondary" type="submit" disabled={pending}>
          {pending ? "Saving disposition…" : "Save disposition"}
        </button>
      </form>
    </details>
  );
}

function ReviewCard({ item, review }: { item: WorkItemRecord; review: AiReviewRecord }) {
  return (
    <article className="ai-review-card" aria-label={`AI review ${review.status}`}>
      <div className="ai-review-heading">
        <strong>AI review</strong>
        <span className="status-chip">{review.status}</span>
      </div>
      <p><strong>Purpose:</strong> {review.purpose}</p>
      <p className="form-help">
        Context: saved work-item record only · Target revision {review.target_revision}
      </p>
      {review.status === "Completed" ? (
        <>
          <p className="ai-review-result">{review.advisory_result}</p>
          <p className="form-help"><strong>This is advisory AI analysis, not verification.</strong></p>
          <details className="record-details">
            <summary>AI provenance</summary>
            <div>
              <p>Provider: {review.provider_label ?? "Not recorded"}</p>
              <p>Model: {review.model ?? "Not recorded"}</p>
              <p>Requested: <time dateTime={review.created_at}>{new Date(review.created_at).toISOString()}</time></p>
              {review.completed_at ? <p>Completed: <time dateTime={review.completed_at}>{new Date(review.completed_at).toISOString()}</time></p> : null}
              <p>Input tokens: {review.prompt_tokens ?? "Not reported"}</p>
              <p>Output tokens: {review.completion_tokens ?? "Not reported"}</p>
              <code>AI review ID: {review.id}</code>
            </div>
          </details>
          {review.disposition ? (
            <div className="entry-note ai-review-disposition-saved">
              <strong>Owner disposition · {review.disposition}</strong>
              <p>{review.disposition_note}</p>
              <p className="form-help">This disposition does not change implementation or verification state.</p>
            </div>
          ) : (
            <ReviewDispositionForm item={item} review={review} />
          )}
        </>
      ) : review.status === "Failed" ? (
        <>
          <p className="form-error">{review.failure_detail ?? "The local AI review did not complete."}</p>
          <p className="form-help">No project finding or verification state was created from this failed review.</p>
        </>
      ) : (
        <p className="form-help">The durable review request is pending local AI completion.</p>
      )}
    </article>
  );
}

export function AiWorkReview({
  item,
  requestId,
  localAiAvailable,
}: {
  item: WorkItemRecord;
  requestId: string;
  localAiAvailable: boolean;
}) {
  const [state, action, pending] = useActionState(requestAiWorkReview, { error: "" });
  const [purpose, setPurpose] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (item.status !== "Implemented") return null;

  return (
    <section className="ai-review-section" aria-labelledby={`ai-review-title-${item.id}`}>
      <h4 id={`ai-review-title-${item.id}`}>AI review</h4>
      <p className="form-help">AI can review this saved work record. It cannot see code, files, external evidence, or systems unless that information is in this record.</p>

      {localAiAvailable ? (
        <details className="work-action ai-review-request">
          <summary>Ask local AI to review</summary>
          <form action={action} className="durable-form" aria-label={`Ask local AI to review: ${item.title}`}>
            <input type="hidden" name="workspaceId" value={item.workspace_id} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="expectedRevision" value={item.revision} />
            <input type="hidden" name="requestId" value={requestId} />
            <label htmlFor={`ai-review-purpose-${item.id}`}>
              What should AI review about this implemented work?
              <textarea
                id={`ai-review-purpose-${item.id}`}
                name="purpose"
                rows={3}
                maxLength={2000}
                required
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <label className="owner-confirm" htmlFor={`ai-review-confirm-${item.id}`}>
              <input
                id={`ai-review-confirm-${item.id}`}
                name="confirm"
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>I understand that only this saved work record is sent to local AI and the result is advisory, not verification.</span>
            </label>
            {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}
            <button className="button secondary" type="submit" disabled={pending}>
              {pending ? "Reviewing with local AI…" : "Run AI review"}
            </button>
          </form>
        </details>
      ) : (
        <p className="form-help">Start a supported local AI model in LM Studio or Ollama to request a new review. Existing saved reviews remain available.</p>
      )}

      {item.ai_reviews.length ? (
        <div className="ai-review-list">
          {item.ai_reviews.map((review) => <ReviewCard key={review.id} item={item} review={review} />)}
        </div>
      ) : (
        <p className="record-empty">No AI reviews recorded for this work.</p>
      )}
    </section>
  );
}
