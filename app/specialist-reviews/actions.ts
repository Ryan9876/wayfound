"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { specialistReviewService } from "@/lib/application/specialist-reviews";

export type SpecialistReviewFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

export async function submitSpecialistReview(_: SpecialistReviewFormState, form: FormData): Promise<SpecialistReviewFormState> {
  await checkOrigin();
  const assignmentId = String(form.get("assignmentId") ?? "");
  const service = await specialistReviewService();
  try {
    await service.submit({
      assignmentId,
      reviewerName: String(form.get("reviewerName") ?? ""),
      competenceStatement: String(form.get("competenceStatement") ?? ""),
      conclusion: String(form.get("conclusion") ?? "") as "No blocking finding" | "Changes required" | "Advisory",
      summary: String(form.get("summary") ?? ""),
      findings: String(form.get("findings") ?? ""),
      confirmCompetence: form.get("confirmCompetence") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "record_specialist_review", assignment_id: assignmentId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the review fields and confirm that this review is within your declared competence."
        : code === "REQUEST_CONFLICT"
          ? "This review request was already used with different details. Reload your specialist reviews before starting again."
          : code === "INVALID_TARGET"
            ? "The assigned artifact version is no longer available."
            : code === "INVALID_STATE"
              ? "This assignment can no longer accept a review. Reload to see its current state."
              : code === "ACCESS_DENIED"
                ? "This specialist review assignment is not available to your account."
                : "We could not confirm the review save. Existing project records are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath("/specialist-reviews");
  redirect(`/specialist-reviews#assignment-${assignmentId}`);
}
