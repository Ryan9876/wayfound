import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { SpecialistReviewStore } from "@/lib/persistence/specialist-reviews";
import {
  validateAssignSpecialistReview,
  validateSubmitSpecialistReview,
  type AssignSpecialistReviewInput,
  type SubmitSpecialistReviewInput,
} from "@/lib/domain/specialist-review";

export async function specialistReviewService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new SpecialistReviewStore(client);
  return {
    identity: () => store.ensureIdentity(),
    listForOwner: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.listForOwner(workspaceId) : Promise.resolve([]),
    listMine: () => store.listMine(),
    assign: (input: AssignSpecialistReviewInput) => store.assign(validateAssignSpecialistReview(input)),
    submit: (input: SubmitSpecialistReviewInput) => store.submit(validateSubmitSpecialistReview(input)),
  };
}
