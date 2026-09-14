"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { aiReviewService } from "@/lib/application/ai-reviews";
import type { AiReviewDisposition } from "@/lib/domain/ai-review";

export type AiReviewFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

export async function requestAiWorkReview(_: AiReviewFormState, form: FormData): Promise<AiReviewFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const workItemId = String(form.get("workItemId") ?? "");
  const service = await aiReviewService();
  try {
    await service.request({
      workspaceId,
      workItemId,
      expectedRevision: Number(form.get("expectedRevision")),
      purpose: String(form.get("purpose") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "request_ai_work_review", workspace_id: workspaceId, work_item_id: workItemId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Describe what you want the local AI to review and confirm the context boundary."
        : code === "REQUEST_CONFLICT"
          ? "This AI-review request was already used with different details. Reload the work item before trying again."
          : code === "INVALID_STATE"
            ? "This work changed or is not an exact current Implemented revision. Reload and review its current state."
            : code === "INVALID_TARGET" || code === "ACCESS_DENIED"
              ? "This work item is not available for AI review by your account."
              : "We could not confirm the AI-review record. Existing project state is unchanged. Reload to check whether the review was saved before retrying.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${workItemId}`);
}

export async function dispositionAiReview(_: AiReviewFormState, form: FormData): Promise<AiReviewFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const workItemId = String(form.get("workItemId") ?? "");
  const reviewId = String(form.get("reviewId") ?? "");
  const service = await aiReviewService();
  try {
    await service.disposition({
      workspaceId,
      reviewId,
      disposition: String(form.get("disposition") ?? "") as AiReviewDisposition,
      note: String(form.get("note") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "disposition_ai_review", workspace_id: workspaceId, review_id: reviewId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Choose how you will use this AI review, add a note, and confirm your disposition."
        : code === "REQUEST_CONFLICT"
          ? "This disposition request was already used with different details. Reload the review before trying again."
          : code === "INVALID_STATE"
            ? "This AI review is no longer eligible for a new disposition. Reload to review the saved state."
            : code === "INVALID_TARGET" || code === "ACCESS_DENIED"
              ? "This AI review is not available for changes by your account."
              : "We could not confirm the disposition save. Existing project records are unchanged. Reload before retrying.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${workItemId}`);
}
