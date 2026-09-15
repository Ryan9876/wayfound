import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}
export async function identityClient(writable = false) {
  if (!authConfigured()) throw new Error("NOT_CONFIGURED");
  const jar = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.APP_ORIGIN?.startsWith("https://") ?? false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // The proxy refreshes cookies for Server Components. Actions can write directly.
        if (writable) values.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}
