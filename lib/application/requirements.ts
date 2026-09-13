import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { RequirementStore } from "@/lib/persistence/requirements";
import { validateCreateRequirement, type CreateRequirementInput } from "@/lib/domain/requirement";

export async function requirementService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new RequirementStore(client);
  return {
    list: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.list(workspaceId) : Promise.resolve([]),
    create: (input: CreateRequirementInput) => store.create(validateCreateRequirement(input)),
  };
}
