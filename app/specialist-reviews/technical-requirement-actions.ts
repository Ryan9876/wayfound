"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { technicalRequirementService } from "@/lib/application/technical-requirements";

export type TechnicalRequirementReviewFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

function messageFor(code: string) {
  if (code === "INVALID_INPUT") return "Complete the required review fields and competence confirmation before saving.";
  if (code === "REQUEST_CONFLICT") return "This request key was already used with different review details. Reload before starting again.";
  if (code === "STALE_STATE") return "The assigned technical requirement revision is no longer current. Ask the owner to assign the current revision.";
  if (code === "INVALID_STATE") return "This technical requirement review is no longer available for submission.";
  if (code === "ACCESS_DENIED") return "This technical requirement review is not assigned to your current reviewer identity.";
  return "We could not confirm the review save. Existing project records are unchanged. Retry with the same details to avoid duplicate history.";
}

export async function submitTechnicalRequirementReview(_: TechnicalRequirementReviewFormState, form: FormData): Promise<TechnicalRequirementReviewFormState> {
  await checkOrigin();
  const assignmentId = String(form.get("assignmentId") ?? "");
  const service = await technicalRequirementService();
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
    console.error(JSON.stringify({ operation: "technical_requirement.review_record", assignment_id: assignmentId, outcome: "failed", code }));
    return { error: messageFor(code) };
  }
  revalidatePath("/specialist-reviews");
  redirect("/specialist-reviews#technical-requirement-reviews");
}
