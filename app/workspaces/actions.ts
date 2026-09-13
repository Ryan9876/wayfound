"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { workspaceService } from "@/lib/application/workspaces";
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
  await client.auth.signOut({ scope: "local" });
  // Always remove this browser's session, including when the provider is unavailable.
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.getAll().filter(c => c.name.startsWith("sb-")).forEach(c => jar.delete(c.name));
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
