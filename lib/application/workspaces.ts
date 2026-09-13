import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { WorkspaceStore } from "@/lib/persistence/workspaces";
import { validateCreate, type CreateInput } from "@/lib/domain/workspace";
export async function workspaceService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) throw new Error("IDENTITY_UNAVAILABLE");
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new WorkspaceStore(client);
  return {
    list: () => store.list(),
    open: (id: string) => /^[0-9a-f-]{36}$/i.test(id) ? store.open(id) : Promise.resolve(null),
    create: (input: CreateInput) => store.create(validateCreate(input)),
  };
}
