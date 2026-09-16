import { NextRequest, NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { discoverDevelopmentAiProviders } from "@/lib/ai/ai-development-console";
import { aiDevelopmentConsoleEnabled, getAiDevelopmentSelection, setAiDevelopmentSelection, type AiDevelopmentSelection } from "@/lib/ai/dev-trace";

export const dynamic = "force-dynamic";

async function authorized() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user && !data.user.is_anonymous);
}

export async function GET() {
  if (!aiDevelopmentConsoleEnabled()) return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  if (!(await authorized())) return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });
  return NextResponse.json({ selection: getAiDevelopmentSelection() }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  if (!aiDevelopmentConsoleEnabled()) return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  if (!process.env.APP_ORIGIN || request.headers.get("origin") !== process.env.APP_ORIGIN) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { provider?: unknown; model?: unknown } | null;
  if (!payload || !(["lm-studio", "ollama", "openai"] as unknown[]).includes(payload.provider) || typeof payload.model !== "string") {
    return NextResponse.json({ error: "Choose a valid provider and model." }, { status: 400 });
  }

  const catalog = await discoverDevelopmentAiProviders();
  const provider = catalog.providers.find(item => item.id === payload.provider);
  const model = payload.model.trim();
  if (!provider || !model || !provider.models.includes(model) || provider.state === "offline" || provider.state === "not-configured") {
    return NextResponse.json({ error: "The selected provider or model is not currently available." }, { status: 400 });
  }

  const selection = setAiDevelopmentSelection(payload.provider as AiDevelopmentSelection["provider"], model);
  return NextResponse.json({ selection }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
