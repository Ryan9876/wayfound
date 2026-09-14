import Link from "next/link";
import { WayfoundLogo } from "./wayfound-logo";
import { signOut } from "@/app/workspaces/actions";

export function WorkspaceFrame({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  const singleUserMode = process.env.WAYFOUND_SINGLE_USER_MODE === "true";

  return <div className="durable-frame"><header className="durable-header"><WayfoundLogo /><nav aria-label="Workspace navigation"><Link href="/demo">Explore demo</Link>{signedIn && <><Link href="/workspaces">Your workspaces</Link>{!singleUserMode && <Link href="/specialist-reviews">Specialist reviews</Link>}<form action={signOut}><button className="button secondary" type="submit">Sign out</button></form></>}</nav></header>{singleUserMode && signedIn ? <div className="single-user-mode-notice" role="status"><strong>Single-user test mode.</strong> Human reviewer workflows are hidden. AI-assisted review will be added as a separate capability and will remain advisory until you accept project direction.</div> : null}<main className="durable-content">{children}</main><footer className="durable-footer">Know the next step. Keep the record.</footer></div>;
}
