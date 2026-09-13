"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) {
 return <main className="durable-content"><section className="durable-card"><span className="eyebrow">Workspace unavailable</span><h1>We could not load your workspace.</h1><p>Your saved record has not been replaced. Check your connection and try again.</p><button className="button primary" type="button" onClick={reset}>Try again</button> <Link href="/sign-in">Return to sign-in</Link></section></main>;
}
