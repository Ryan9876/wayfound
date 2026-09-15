import { NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { detectLocalAi } from "@/lib/ai/local-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.WAYFOUND_SINGLE_USER_MODE !== "true") {
    return NextResponse.json({ error: "Local AI status is available only in single-user mode." }, { status: 404 });
  }
  try {
    const client = await identityClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) {
      return NextResponse.json({ error: "A Wayfound owner session is required before checking local AI." }, { status: 401 });
    }
    return NextResponse.json(await detectLocalAi(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "Local AI status is unavailable." }, { status: 503 });
  }
}
