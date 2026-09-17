import { configurationError } from './domain/errors';
import { requireEnvironmentIsolation } from './domain/environment-rules';

export function assertEnvironmentIsolation(): void {
  requireEnvironmentIsolation({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    dataEnvironment: process.env.WAYFOUND_DATA_ENV,
  });
}

export function requireDatabaseUrl(): string {
  assertEnvironmentIsolation();
  const value = process.env.DATABASE_URL;
  if (!value) throw configurationError('DATABASE_URL is required for durable project operations.');
  return value;
}

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
