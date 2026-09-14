import { NextResponse } from "next/server";
import { identityClient } from "@/lib/auth/server";
import { runLocalAiHealthTest } from "@/lib/ai/local-ai-health";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.WAYFOUND_SINGLE_USER_MODE !== "true") {
    return NextResponse.json({ error: "Local AI testing is available only in single-user mode." }, { status: 404 });
  }

  try {
    const client = await identityClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json({ error: "A Wayfound owner session is required before testing local AI." }, { status: 401 });
    }

    const result = await runLocalAiHealthTest();
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "The local AI test could not start." }, { status: 503 });
  }
}
