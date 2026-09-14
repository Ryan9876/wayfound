import "server-only";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { WorkItemStore } from "@/lib/persistence/work-items";
import {
  validateAddWorkItemDependency,
  validateCreateWorkItem,
  validateRemoveWorkItemDependency,
  validateTransitionWorkItem,
  type AddWorkItemDependencyInput,
  type CreateWorkItemInput,
  type RemoveWorkItemDependencyInput,
  type TransitionWorkItemInput,
} from "@/lib/domain/work-item";

export async function workItemService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");
  const store = new WorkItemStore(client);
  return {
    list: (workspaceId: string) => /^[0-9a-f-]{36}$/i.test(workspaceId) ? store.list(workspaceId) : Promise.resolve([]),
    transition: (input: TransitionWorkItemInput) => store.transition(validateTransitionWorkItem(input)),
    create: (input: CreateWorkItemInput) => store.create(validateCreateWorkItem(input)),
    addDependency: (input: AddWorkItemDependencyInput) => store.addDependency(validateAddWorkItemDependency(input)),
    removeDependency: (input: RemoveWorkItemDependencyInput) => store.removeDependency(validateRemoveWorkItemDependency(input)),
  };
}
