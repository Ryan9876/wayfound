import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { TechnicalDecisionStore } from "@/lib/persistence/technical-decisions";
import {
  validateAcceptTechnicalChoice,
  validateAssignTechnicalChoiceReview,
  validateCreateTechnicalChoice,
  validateReviseTechnicalChoice,
  validateSubmitTechnicalChoiceReview,
  type AcceptTechnicalChoiceInput,
  type AssignTechnicalChoiceReviewInput,
  type CreateTechnicalChoiceInput,
  type ReviseTechnicalChoiceInput,
  type SubmitTechnicalChoiceReviewInput,
} from "@/lib/domain/technical-decision";

export async function technicalDecisionService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new TechnicalDecisionStore(client);
  return {
    listForOwner: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.listForOwner(workspaceId) : Promise.resolve([]),
    listMine: () => store.listMine(),
    create: (input: CreateTechnicalChoiceInput) => store.create(validateCreateTechnicalChoice(input)),
    revise: (input: ReviseTechnicalChoiceInput) => store.revise(validateReviseTechnicalChoice(input)),
    assign: (input: AssignTechnicalChoiceReviewInput) => store.assign(validateAssignTechnicalChoiceReview(input)),
    submit: (input: SubmitTechnicalChoiceReviewInput) => store.submit(validateSubmitTechnicalChoiceReview(input)),
    accept: (input: AcceptTechnicalChoiceInput) => store.accept(validateAcceptTechnicalChoice(input)),
  };
}
