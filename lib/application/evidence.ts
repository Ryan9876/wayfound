import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { EvidenceStore } from "@/lib/persistence/evidence";
import { validateCreateEvidence, type CreateEvidenceInput } from "@/lib/domain/evidence";

export async function evidenceService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");

  const store = new EvidenceStore(client);
  return {
    list: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.list(workspaceId) : Promise.resolve([]),
    create: (input: CreateEvidenceInput) => store.create(validateCreateEvidence(input)),
  };
}
