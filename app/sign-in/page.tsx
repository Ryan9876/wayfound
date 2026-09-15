import { redirect } from "next/navigation";
import { WorkspaceFrame } from "@/components/workspace-frame";
import { SignInForm } from "@/components/workspace-forms";
import { authConfigured } from "@/lib/auth/server";
import { singleUserInteractiveLoginDisabled } from "@/lib/auth/single-user-auto-session";
export const dynamic = "force-dynamic";
export default function SignInPage() {
 if (singleUserInteractiveLoginDisabled()) redirect("/workspaces");
 return <WorkspaceFrame><div className="entry-grid"><section className="entry-intro"><span className="eyebrow">Your delivery workspace</span><h1>Pick up where<br />you left off.</h1><p>Keep your project, decisions, and next steps in one place.</p><div className="entry-note"><strong>Your record stays with your workspace.</strong><p>Return to the same release and stage without rebuilding the context from a conversation.</p></div></section><section className="durable-card"><span className="eyebrow">Welcome back</span><h2>Sign in to Wayfound</h2><p>Use your development account to continue.</p>{authConfigured() ? <SignInForm /> : <p role="status" className="form-error">Sign-in is not configured in this environment. The illustrative demo is available above.</p>}</section></div></WorkspaceFrame>;
}
