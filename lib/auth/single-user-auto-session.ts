export type SingleUserAutoSessionConfig = {
  email: string;
  password: string;
};

function isLoopbackHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  } catch {
    return false;
  }
}

export function singleUserAutoSessionConfig(): SingleUserAutoSessionConfig | null {
  if (process.env.WAYFOUND_SINGLE_USER_MODE !== "true") return null;
  if (process.env.WAYFOUND_SINGLE_USER_AUTO_SIGN_IN !== "true") return null;
  if (process.env.WAYFOUND_LOCAL_TEST !== "1") return null;
  if (!isLoopbackHttpUrl(process.env.APP_ORIGIN) || !isLoopbackHttpUrl(process.env.SUPABASE_URL)) return null;

  const email = process.env.WAYFOUND_SINGLE_USER_OWNER_EMAIL?.trim() ?? "";
  const password = process.env.WAYFOUND_SINGLE_USER_OWNER_PASSWORD ?? "";
  if (!email || email.length > 254 || !password || password.length < 12 || password.length > 1024) return null;

  return { email, password };
}

export function singleUserInteractiveLoginDisabled(): boolean {
  return singleUserAutoSessionConfig() !== null;
}
