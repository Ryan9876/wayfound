import { NextRequest, NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { aiDevelopmentConsoleEnabled, clearAiDevTrace, getAiDevTrace } from "@/lib/ai/dev-trace";

export const dynamic = "force-dynamic";

async function authorized() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user && !data.user.is_anonymous);
}

export async function GET() {
  if (!aiDevelopmentConsoleEnabled()) return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  if (!(await authorized())) return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });
  return NextResponse.json({ entries: getAiDevTrace() }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function DELETE(request: NextRequest) {
  if (!aiDevelopmentConsoleEnabled()) return NextResponse.json({ error: "AI development console is disabled." }, { status: 404 });
  if (!process.env.APP_ORIGIN || request.headers.get("origin") !== process.env.APP_ORIGIN) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "A Wayfound owner session is required." }, { status: 401 });
  clearAiDevTrace();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
