"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { workspaceService } from "@/lib/application/workspaces";
import { decisionService } from "@/lib/application/decisions";
import { workItemService } from "@/lib/application/work-items";
import { requirementService } from "@/lib/application/requirements";
import { evidenceService } from "@/lib/application/evidence";
import { artifactService } from "@/lib/application/artifacts";
export type FormState = { error: string };
async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 1024) return { error: "Enter your email and password." };
  try {
    const client = await identityClient(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: "Sign-in failed. Check your details and try again." };
  } catch { return { error: "Sign-in is unavailable. Please try again." }; }
  redirect("/workspaces");
}
export async function signOut() {
  await checkOrigin();
  const client = await identityClient(true);
  try {
    await client.auth.signOut({ scope: "local" });
  } finally {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    jar.getAll().filter(c => c.name.startsWith("sb-")).forEach(c => jar.delete(c.name));
  }
  redirect("/sign-in");
}
export async function createWorkspace(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const service = await workspaceService();
  let id: string;
  try {
    id = await service.create({ name: String(form.get("name") ?? ""), problem: String(form.get("problem") ?? ""), release: String(form.get("release") ?? ""), requestId: String(form.get("requestId") ?? "") });
  } catch (error) {
    console.error(JSON.stringify({ operation: "create_workspace", outcome: "failed", code: error instanceof Error ? error.message : "UNKNOWN" }));
    return { error: error instanceof Error && error.message === "INVALID_INPUT" ? "Check the fields and try again." : error instanceof Error && error.message === "REQUEST_CONFLICT" ? "This request was already used with different details. Open your workspace list before starting again." : "We could not confirm the save. Your existing work is unchanged. Retry with the same details to avoid a duplicate." };
  }
  redirect(`/workspaces/${id}`);
}
export async function createDecision(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await decisionService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      decision: String(form.get("decision") ?? ""),
      rationale: String(form.get("rationale") ?? ""),
      confirmAuthority: form.get("confirmAuthority") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "record_owner_decision", workspace_id: workspaceId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the decision fields and confirm that this choice is within product-owner authority."
        : code === "REQUEST_CONFLICT"
          ? "This decision request was already used with different details. Reload the workspace before starting again."
          : code === "ACCESS_DENIED"
            ? "This workspace is not available for decision changes."
            : "We could not confirm the decision save. Existing records are unchanged. Retry with the same details to avoid a duplicate.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#decisions`);
}
export async function createWorkItem(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await workItemService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      outcome: String(form.get("outcome") ?? ""),
      completionCondition: String(form.get("completionCondition") ?? ""),
      evidenceExpectation: String(form.get("evidenceExpectation") ?? ""),
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "create_proposed_work_item", workspace_id: workspaceId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete all work-item fields and try again."
        : code === "REQUEST_CONFLICT"
          ? "This work-item request was already used with different details. Reload the workspace before starting again."
          : code === "ACCESS_DENIED"
            ? "This workspace is not available for work-item changes."
            : "We could not confirm the work-item save. Existing records are unchanged. Retry with the same details to avoid a duplicate.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#work-items`);
}
export async function createRequirement(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await requirementService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      obligation: String(form.get("obligation") ?? "") as "MUST" | "SHOULD" | "MAY",
      requirement: String(form.get("requirement") ?? ""),
      acceptanceCriterion: String(form.get("acceptanceCriterion") ?? ""),
      confirmAuthority: form.get("confirmAuthority") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "record_owner_requirement", workspace_id: workspaceId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the requirement and acceptance criterion, then confirm product-owner authority."
        : code === "REQUEST_CONFLICT"
          ? "This requirement request was already used with different details. Reload the workspace before starting again."
          : code === "ACCESS_DENIED"
            ? "This workspace is not available for requirement changes."
            : "We could not confirm the requirement save. Existing records are unchanged. Retry with the same details to avoid a duplicate.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#requirements`);
}
export async function createEvidence(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const acceptanceCriterionId = String(form.get("acceptanceCriterionId") ?? "");
  const service = await evidenceService();
  try {
    await service.create({
      workspaceId,
      acceptanceCriterionId,
      title: String(form.get("title") ?? ""),
      result: String(form.get("result") ?? ""),
      sourceNote: String(form.get("sourceNote") ?? ""),
      effect: String(form.get("effect") ?? "") as "Supports" | "Challenges" | "Inconclusive",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "record_criterion_evidence", workspace_id: workspaceId, acceptance_criterion_id: acceptanceCriterionId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the evidence fields and choose how the result relates to the criterion."
        : code === "REQUEST_CONFLICT"
          ? "This evidence request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "This acceptance criterion is not available in this workspace."
            : code === "ACCESS_DENIED"
              ? "This workspace is not available for evidence changes."
              : "We could not confirm the evidence save. Existing records are unchanged. Retry with the same details to avoid a duplicate.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#criterion-${acceptanceCriterionId}`);
}
export async function createArtifact(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await artifactService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      kind: String(form.get("kind") ?? ""),
      summary: String(form.get("summary") ?? ""),
      referenceLabel: String(form.get("referenceLabel") ?? ""),
      referenceUrl: String(form.get("referenceUrl") ?? ""),
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "create_proposed_artifact", workspace_id: workspaceId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Complete the artifact fields and enter an HTTP or HTTPS reference URL."
        : code === "REQUEST_CONFLICT"
          ? "This artifact request was already used with different details. Reload the workspace before starting again."
          : code === "ACCESS_DENIED"
            ? "This workspace is not available for artifact changes."
            : "We could not confirm the artifact save. Existing records are unchanged. Retry with the same details to avoid a duplicate.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#artifacts`);
}
export async function acceptArtifactVersion(_: FormState, form: FormData): Promise<FormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const artifactId = String(form.get("artifactId") ?? "");
  const versionId = String(form.get("versionId") ?? "");
  const service = await artifactService();
  try {
    await service.accept({
      workspaceId,
      artifactId,
      versionId,
      confirmAuthority: form.get("confirmAuthority") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "accept_artifact_version", workspace_id: workspaceId, artifact_id: artifactId, version_id: versionId, outcome: "failed", code }));
    return {
      error: code === "INVALID_INPUT"
        ? "Confirm product-owner authority before accepting this artifact version."
        : code === "REQUEST_CONFLICT"
          ? "This acceptance request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "This artifact version is not available in this workspace."
            : code === "INVALID_STATE"
              ? "This artifact version is no longer Proposed. Reload the workspace to review its current state."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for artifact acceptance."
                : "We could not confirm artifact acceptance. Existing project direction is unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}#artifact-${artifactId}`);
}
