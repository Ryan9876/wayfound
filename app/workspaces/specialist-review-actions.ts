"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { specialistReviewService } from "@/lib/application/specialist-reviews";

export type SpecialistAssignmentFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

export async function assignSpecialistReview(_: SpecialistAssignmentFormState, form: FormData): Promise<SpecialistAssignmentFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const artifactId = String(form.get("artifactId") ?? "");
  const versionId = String(form.get("versionId") ?? "");
  const service = await specialistReviewService();
  try {
    await service.assign({
      workspaceId,
      artifactId,
      versionId,
      reviewerCode: String(form.get("reviewerCode") ?? ""),
      requestedCompetence: String(form.get("requestedCompetence") ?? ""),
      reviewQuestion: String(form.get("reviewQuestion") ?? ""),
      confirmScope: form.get("confirmScope") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "assign_specialist_review", workspace_id: workspaceId, artifact_id: artifactId, version_id: versionId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the review request, enter a valid reviewer code, and confirm the bounded specialist scope."
        : code === "REQUEST_CONFLICT"
          ? "This assignment request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "The reviewer or artifact version is not available for this review assignment."
            : code === "INVALID_STATE"
              ? "This artifact version cannot receive this specialist assignment in its current state."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for specialist-review assignment."
                : "We could not confirm the specialist-review assignment. Existing project records are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/specialist-reviews");
  redirect(`/workspaces/${workspaceId}#artifact-${artifactId}`);
}
