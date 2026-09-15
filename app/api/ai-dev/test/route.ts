import { NextRequest, NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { testDevelopmentAiSelection } from "@/lib/ai/ai-development-console";
import { aiDevelopmentConsoleEnabled } from "@/lib/ai/dev-trace";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!aiDevelopmentConsoleEnabled()) {
    return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  }
  if (!process.env.APP_ORIGIN || request.headers.get("origin") !== process.env.APP_ORIGIN) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const client = await identityClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) {
      return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });
    }
    const payload = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
    if (!payload || typeof payload.provider !== "string" || typeof payload.model !== "string") {
      return NextResponse.json({ error: "Choose a provider and model." }, { status: 400 });
    }
    const result = await testDevelopmentAiSelection(payload.provider, payload.model);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "INVALID_SELECTION" || code === "UNAVAILABLE_SELECTION") {
      return NextResponse.json({ error: code === "INVALID_SELECTION" ? "Choose a valid provider and model." : "The selected provider or model is not currently available." }, { status: 400 });
    }
    return NextResponse.json({ error: "The AI development test could not start." }, { status: 503 });
  }
}
