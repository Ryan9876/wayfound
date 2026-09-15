import { NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { discoverDevelopmentAiProviders } from "@/lib/ai/ai-development-console";
import { aiDevelopmentConsoleEnabled } from "@/lib/ai/dev-trace";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!aiDevelopmentConsoleEnabled()) {
    return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  }
  try {
    const client = await identityClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) {
      return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });
    }
    return NextResponse.json(await discoverDevelopmentAiProviders(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "AI provider discovery is unavailable." }, { status: 503 });
  }
}
