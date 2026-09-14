import Link from "next/link";
import { WayfoundLogo } from "./wayfound-logo";
import { LocalAiStatus } from "./local-ai-status";
import { signOut } from "@/app/workspaces/actions";
import { detectLocalAi } from "@/lib/ai/local-ai";

export async function WorkspaceFrame({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  const singleUserMode = process.env.WAYFOUND_SINGLE_USER_MODE === "true";
  const aiStatus = singleUserMode && signedIn ? await detectLocalAi() : null;

  return <div className="durable-frame"><header className="durable-header"><WayfoundLogo /><div className="durable-header-actions">{aiStatus ? <LocalAiStatus status={aiStatus} /> : null}<nav aria-label="Workspace navigation"><Link href="/demo">Explore demo</Link>{signedIn && <><Link href="/workspaces">Your workspaces</Link>{!singleUserMode && <Link href="/specialist-reviews">Specialist reviews</Link>}<form action={signOut}><button className="button secondary" type="submit">Sign out</button></form></>}</nav></div></header>{singleUserMode && signedIn ? <div className="single-user-mode-notice" role="status"><strong>Single-user test mode.</strong> Human reviewer workflows are hidden. Local AI is auto-detected from LM Studio or Ollama, cloud fallback is disabled, and AI output remains advisory until you accept project direction.</div> : null}<main className="durable-content">{children}</main><footer className="durable-footer">Know the next step. Keep the record.</footer></div>;
}
