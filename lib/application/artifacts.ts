import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { ArtifactStore } from "@/lib/persistence/artifacts";
import { validateCreateArtifact, type CreateArtifactInput } from "@/lib/domain/artifact";

export async function artifactService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");

  const store = new ArtifactStore(client);
  return {
    list: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.list(workspaceId) : Promise.resolve([]),
    create: (input: CreateArtifactInput) => store.create(validateCreateArtifact(input)),
  };
}
