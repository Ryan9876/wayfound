import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const singleUserMode = process.env.WAYFOUND_SINGLE_USER_MODE === "true";
  if (singleUserMode && request.nextUrl.pathname === "/specialist-reviews") {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }
  if (singleUserMode && request.nextUrl.pathname === "/handoffs") {
    return NextResponse.redirect(new URL("/records", request.url));
  }

  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const client = createServerClient(url, key, {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false },
      global: { fetch: (input, options) => fetch(input, { ...options, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Errors are handled by the route. Never substitute fixture data on provider failure.
    await client.auth.getUser().catch(() => null);
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/sign-in", "/workspaces/:path*", "/specialist-reviews", "/handoffs"] };
