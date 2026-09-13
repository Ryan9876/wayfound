"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { technicalDecisionService } from "@/lib/application/technical-decisions";

export type TechnicalChoiceReviewFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

export async function submitTechnicalChoiceReview(_: TechnicalChoiceReviewFormState, form: FormData): Promise<TechnicalChoiceReviewFormState> {
  await checkOrigin();
  const assignmentId = String(form.get("assignmentId") ?? "");
  const service = await technicalDecisionService();
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
    console.error(JSON.stringify({ operation: "technical_choice.review_record", assignment_id: assignmentId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the review fields and confirm that this review is within your declared competence."
        : code === "REQUEST_CONFLICT"
          ? "This review request was already used with different details. Reload your specialist reviews before starting again."
          : code === "INVALID_TARGET"
            ? "The assigned technical choice is no longer available."
            : code === "STALE_STATE"
              ? "The owner revised this technical choice after your assignment. This assignment is stale and cannot establish current technical judgment."
              : code === "INVALID_STATE"
                ? "This assignment can no longer accept a review. Reload to see its current state."
                : code === "ACCESS_DENIED"
                  ? "This technical review assignment is not available to your account."
                  : "We could not confirm the review save. Existing project records are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath("/specialist-reviews");
  redirect(`/specialist-reviews#technical-assignment-${assignmentId}`);
}
