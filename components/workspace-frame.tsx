import Link from "next/link";
import { WayfoundLogo } from "./wayfound-logo";
import { signOut } from "@/app/workspaces/actions";
export function WorkspaceFrame({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  return <div className="durable-frame"><header className="durable-header"><WayfoundLogo /><nav aria-label="Workspace navigation"><Link href="/demo">Explore demo</Link>{signedIn && <><Link href="/workspaces">Your workspaces</Link><form action={signOut}><button className="button secondary" type="submit">Sign out</button></form></>}</nav></header><main className="durable-content">{children}</main><footer className="durable-footer">Know the next step. Keep the record.</footer></div>;
}
