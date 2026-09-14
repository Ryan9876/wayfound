import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { TechnicalRequirementStore } from "@/lib/persistence/technical-requirements";
import {
  validateApproveTechnicalRequirement,
  validateAssignTechnicalRequirementReview,
  validateCreateTechnicalRequirement,
  validateReviseTechnicalRequirement,
  validateSubmitTechnicalRequirementReview,
  type ApproveTechnicalRequirementInput,
  type AssignTechnicalRequirementReviewInput,
  type CreateTechnicalRequirementInput,
  type ReviseTechnicalRequirementInput,
  type SubmitTechnicalRequirementReviewInput,
} from "@/lib/domain/technical-requirement";

export async function technicalRequirementService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new TechnicalRequirementStore(client);
  return {
    listForOwner: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.listForOwner(workspaceId) : Promise.resolve([]),
    listMine: () => store.listMine(),
    create: (input: CreateTechnicalRequirementInput) => store.create(validateCreateTechnicalRequirement(input)),
    revise: (input: ReviseTechnicalRequirementInput) => store.revise(validateReviseTechnicalRequirement(input)),
    assign: (input: AssignTechnicalRequirementReviewInput) => store.assign(validateAssignTechnicalRequirementReview(input)),
    submit: (input: SubmitTechnicalRequirementReviewInput) => store.submit(validateSubmitTechnicalRequirementReview(input)),
    approve: (input: ApproveTechnicalRequirementInput) => store.approve(validateApproveTechnicalRequirement(input)),
  };
}
