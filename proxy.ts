import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { singleUserAutoSessionConfig } from "@/lib/auth/single-user-auto-session";

function redirectWithAuthCookies(url: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    const { name, value, ...options } = cookie;
    redirect.cookies.set(name, value, options);
  }
  redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
  return redirect;
}

export async function proxy(request: NextRequest) {
  const singleUserMode = process.env.WAYFOUND_SINGLE_USER_MODE === "true";
  const autoSession = singleUserAutoSessionConfig();
  if (singleUserMode && request.nextUrl.pathname === "/specialist-reviews") {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }
  if (singleUserMode && request.nextUrl.pathname === "/handoffs") {
    return NextResponse.redirect(new URL("/records", request.url));
  }

  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let authenticated = false;

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

    // Preserve authenticated owner semantics while removing interactive login from the guarded local single-user path.
    const current = await client.auth.getUser().catch(() => null);
    authenticated = Boolean(current?.data.user && !current.data.user.is_anonymous);

    if (!authenticated && autoSession) {
      const result = await client.auth.signInWithPassword({ email: autoSession.email, password: autoSession.password });
      authenticated = Boolean(result.data.user && !result.data.user.is_anonymous && !result.error);
      if (result.error) {
        console.error(JSON.stringify({ operation: "single_user_auto_session", outcome: "failed", code: result.error.name }));
      }
    }
  }

  if (autoSession && authenticated && request.nextUrl.pathname === "/sign-in") {
    return redirectWithAuthCookies(new URL("/workspaces", request.url), response);
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/sign-in", "/workspaces/:path*", "/specialist-reviews", "/handoffs"] };
