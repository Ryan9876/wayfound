"use client";
import { useActionState } from "react";
import { signIn, createWorkspace } from "@/app/workspaces/actions";
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <form action={action} className="durable-form"><label htmlFor="email">Email<input id="email" name="email" type="email" autoComplete="username" required maxLength={254} /></label><label htmlFor="password">Password<input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>{state.error && <p role="alert" className="form-error">{state.error}</p>}<button className="button primary" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>;
}
export function CreateWorkspaceForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(createWorkspace, { error: "" });
  return <form action={action} className="durable-form"><input type="hidden" name="requestId" value={requestId} /><label htmlFor="name">Project name<input id="name" name="name" required maxLength={120} placeholder="Name your project" /></label><label htmlFor="problem">What problem do you want to solve?<textarea id="problem" name="problem" rows={4} required maxLength={2000} placeholder="Describe the problem and who experiences it." /></label><label htmlFor="release">Release name<input id="release" name="release" required maxLength={80} defaultValue="Release 1.0" /></label><p className="form-help">Your workspace starts at Clarify. No stages are marked complete.</p>{state.error && <p role="alert" className="form-error">{state.error}</p>}<button className="button primary" type="submit" disabled={pending}>{pending ? "Saving workspace…" : "Create workspace"}</button></form>;
}
