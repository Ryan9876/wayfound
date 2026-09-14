import Link from "next/link";
import { WayfoundLogo } from "./wayfound-logo";
import { LocalAiStatus } from "./local-ai-status";
import { signOut } from "@/app/workspaces/actions";
import { detectLocalAi } from "@/lib/ai/local-ai";
import { singleUserInteractiveLoginDisabled } from "@/lib/auth/single-user-auto-session";

export async function WorkspaceFrame({
  children,
  signedIn = false,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
}) {
  const singleUserMode = process.env.WAYFOUND_SINGLE_USER_MODE === "true";
  const noInteractiveLogin = singleUserInteractiveLoginDisabled();
  const aiStatus = singleUserMode && signedIn ? await detectLocalAi() : null;
  return (
    <div className="durable-frame">
      <a className="project-skip" href="#workspace-main">
        Skip to content
      </a>
      <header className="durable-header">
        <WayfoundLogo />
        <div className="durable-header-actions">
          {aiStatus ? <LocalAiStatus status={aiStatus} /> : null}
          <nav aria-label="Workspace navigation">
            {signedIn && (
              <>
                <Link href="/workspaces">
                  {singleUserMode ? "Your projects" : "Your workspaces"}
                </Link>
                {!singleUserMode && (
                  <Link href="/specialist-reviews">Specialist reviews</Link>
                )}
                {!noInteractiveLogin && (
                  <form action={signOut}>
                    <button className="button secondary" type="submit">
                      Sign out
                    </button>
                  </form>
                )}
              </>
            )}
            <details className="workspace-help">
              <summary>About</summary>
              <p>
                AI suggestions are advice. You decide what becomes project
                direction.
              </p>
              {singleUserMode && (
                <p>
                  Local AI connects through LM Studio or Ollama. There is no
                  automatic cloud fallback.
                </p>
              )}
              <Link href="/demo">Explore demo</Link>
            </details>
          </nav>
        </div>
      </header>
      <main id="workspace-main" tabIndex={-1} className="durable-content">
        {children}
      </main>
    </div>
  );
}
